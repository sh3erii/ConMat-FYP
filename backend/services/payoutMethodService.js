const crypto = require('crypto');
const { Op } = require('sequelize');
const { paymentsDB } = require('../config/database');
const { SellerPaymentMethod, SellerPayout } = require('../models');

const SELLER_ROLES = new Set(['Supplier', 'Wholesaler', 'Retailer']);
const PROVIDERS = Object.freeze({
  JazzCash: { label: 'JazzCash', kind: 'mobile-wallet' },
  Easypaisa: { label: 'Easypaisa', kind: 'mobile-wallet' },
  NayaPay: { label: 'NayaPay', kind: 'mobile-wallet' },
  UBL: { label: 'UBL', kind: 'bank' },
  'Meezan Bank': { label: 'Meezan Bank', kind: 'bank' },
});

function assertPayoutSeller(user) {
  if (!user || !SELLER_ROLES.has(user.role)) {
    throw Object.assign(new Error('Only seller accounts can configure payout methods.'), { status: 403 });
  }
}

function normalizeProvider(value) {
  const input = String(value || '').trim().toLowerCase();
  const provider = Object.keys(PROVIDERS).find((key) => key.toLowerCase() === input);
  if (!provider) {
    throw Object.assign(new Error(`Choose a supported payout method: ${Object.keys(PROVIDERS).join(', ')}.`), { status: 400 });
  }
  return provider;
}

function normalizeAccountIdentifier(provider, value) {
  const raw = String(value || '').trim();
  if (PROVIDERS[provider].kind === 'mobile-wallet') {
    const digits = raw.replace(/\D/g, '');
    const local = digits.startsWith('92') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits;
    if (!/^3\d{9}$/.test(local)) {
      throw Object.assign(new Error(`${provider} requires a valid Pakistani mobile number.`), { status: 400 });
    }
    return `+92${local}`;
  }

  const normalized = raw.replace(/[\s-]/g, '').toUpperCase();
  const validIban = /^PK\d{2}[A-Z]{4}\d{16}$/.test(normalized);
  const validAccountNumber = /^\d{8,24}$/.test(normalized);
  if (!validIban && !validAccountNumber) {
    throw Object.assign(new Error(`${provider} requires a valid Pakistan IBAN or an 8-24 digit account number.`), { status: 400 });
  }
  return normalized;
}

function encryptionKey() {
  const secret = process.env.PAYOUT_DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error('Payout data encryption is not configured.'), { status: 503 });
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptAccountIdentifier(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

function decryptAccountIdentifier(value) {
  const [version, ivText, tagText, encryptedText] = String(value || '').split(':');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw new Error('Stored payout details are invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8');
}

function publicPaymentMethod(method) {
  const row = method?.toJSON ? method.toJSON() : method;
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    accountTitle: row.accountTitle,
    maskedIdentifier: `${row.provider} ending in ${row.accountIdentifierLast4}`,
    isDefault: Boolean(row.isDefault),
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listSellerPaymentMethods(sellerId) {
  const rows = await SellerPaymentMethod.findAll({
    where: { sellerId, active: true },
    order: [['isDefault', 'DESC'], ['createdAt', 'ASC']],
  });
  return rows.map(publicPaymentMethod);
}

async function createSellerPaymentMethod(user, payload) {
  assertPayoutSeller(user);
  const provider = normalizeProvider(payload.provider);
  const accountTitle = String(payload.accountTitle || '').trim().replace(/\s+/g, ' ');
  if (accountTitle.length < 2 || accountTitle.length > 120) {
    throw Object.assign(new Error('Account title must be between 2 and 120 characters.'), { status: 400 });
  }
  const identifier = normalizeAccountIdentifier(provider, payload.accountIdentifier);

  return await paymentsDB.transaction(async (transaction) => {
    const existingCount = await SellerPaymentMethod.count({ where: { sellerId: user.id, active: true }, transaction });
    const makeDefault = existingCount === 0 || payload.isDefault === true;
    if (makeDefault) {
      await SellerPaymentMethod.update({ isDefault: false }, { where: { sellerId: user.id }, transaction });
    }
    const method = await SellerPaymentMethod.create({
      sellerId: user.id,
      provider,
      accountTitle,
      accountIdentifierEncrypted: encryptAccountIdentifier(identifier),
      accountIdentifierLast4: identifier.slice(-4),
      isDefault: makeDefault,
      active: true,
    }, { transaction });
    return publicPaymentMethod(method);
  });
}

async function findOwnedMethod(user, methodId, transaction = null) {
  const method = await SellerPaymentMethod.findOne({ where: { id: methodId, sellerId: user.id, active: true }, transaction });
  if (!method) throw Object.assign(new Error('Payout method not found.'), { status: 404 });
  return method;
}

async function setDefaultSellerPaymentMethod(user, methodId) {
  assertPayoutSeller(user);
  return await paymentsDB.transaction(async (transaction) => {
    const method = await findOwnedMethod(user, methodId, transaction);
    await SellerPaymentMethod.update({ isDefault: false }, { where: { sellerId: user.id }, transaction });
    await method.update({ isDefault: true }, { transaction });
    return publicPaymentMethod(method);
  });
}

async function removeSellerPaymentMethod(user, methodId) {
  assertPayoutSeller(user);
  return await paymentsDB.transaction(async (transaction) => {
    const method = await findOwnedMethod(user, methodId, transaction);
    const committedPayouts = await SellerPayout.count({
      where: {
        payoutMethodId: method.id,
        status: { [Op.in]: ['Pending', 'Processing', 'Failed'] },
      },
      transaction,
    });
    if (committedPayouts > 0) {
      throw Object.assign(new Error('This payout method is assigned to an unpaid seller balance and cannot be removed yet.'), { status: 409 });
    }

    const wasDefault = method.isDefault;
    await method.update({ active: false, isDefault: false }, { transaction });
    if (wasDefault) {
      const replacement = await SellerPaymentMethod.findOne({
        where: { sellerId: user.id, active: true, id: { [Op.ne]: method.id } },
        order: [['createdAt', 'ASC']],
        transaction,
      });
      if (replacement) await replacement.update({ isDefault: true }, { transaction });
    }
    return publicPaymentMethod(method);
  });
}

async function defaultMethodsForSellers(sellerIds) {
  if (!sellerIds.length) return new Map();
  const rows = await SellerPaymentMethod.findAll({
    where: { sellerId: { [Op.in]: sellerIds }, active: true },
    order: [['isDefault', 'DESC'], ['createdAt', 'ASC']],
  });
  const methods = new Map();
  for (const method of rows) {
    if (!methods.has(method.sellerId)) methods.set(method.sellerId, method);
  }
  return methods;
}

module.exports = {
  PROVIDERS,
  assertPayoutSeller,
  normalizeProvider,
  normalizeAccountIdentifier,
  encryptAccountIdentifier,
  decryptAccountIdentifier,
  publicPaymentMethod,
  listSellerPaymentMethods,
  createSellerPaymentMethod,
  setDefaultSellerPaymentMethod,
  removeSellerPaymentMethod,
  defaultMethodsForSellers,
};
