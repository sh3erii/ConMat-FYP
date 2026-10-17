const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const Product = require('../models/Product');
const { safeUser, publicFile } = require('../services/formatters');
const { formatSecurityLog } = require('../services/securityLogService');
const { listRecentActivities } = require('../services/recentActivityService');
const { runSafely } = require('../services/asyncService');
const { defaultMethodsForSellers } = require('../services/payoutMethodService');

const BUSINESS_ROLES = new Set(['Supplier', 'Wholesaler', 'Retailer']);
const addressOf = (u) => [u.street, u.city, u.postalCode].filter(Boolean).join(', ');
const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

exports.getMyProfile = async (req, res) => {
  const data = safeUser(req.user, req);
  data.address = addressOf(data);
  res.json({ success: true, data });
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (req.body.phone !== undefined && req.body.phone !== null && req.body.phone !== '') {
      const phoneDigits = String(req.body.phone).replace(/\D/g, '');
      if (phoneDigits.length !== 12 || !phoneDigits.startsWith('92')) {
        return res.status(400).json({ success: false, message: 'Phone number must be +92 followed by exactly 10 digits.' });
      }
      const formattedPhone = `+${phoneDigits}`;
      const existingPhone = await User.findOne({
        where: {
          id: { [Op.ne]: req.user.id },
          phone: { [Op.in]: [req.body.phone, formattedPhone, phoneDigits] }
        }
      });
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'Phone number is already in use by another account.' });
      }
    }
    const latitudeRaw = req.body.latitude !== undefined ? req.body.latitude : user.latitude;
    const longitudeRaw = req.body.longitude !== undefined ? req.body.longitude : user.longitude;
    const hasLatitude = hasValue(latitudeRaw);
    const hasLongitude = hasValue(longitudeRaw);

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude must be provided together.' });
    }
    if (BUSINESS_ROLES.has(user.role) && !hasLatitude) {
      return res.status(400).json({ success: false, message: 'Business location coordinates are required for business accounts.' });
    }

    let nextLatitude = null;
    let nextLongitude = null;
    if (hasLatitude && hasLongitude) {
      nextLatitude = Number(latitudeRaw);
      nextLongitude = Number(longitudeRaw);
      if (!Number.isFinite(nextLatitude) || nextLatitude < -90 || nextLatitude > 90 ||
          !Number.isFinite(nextLongitude) || nextLongitude < -180 || nextLongitude > 180) {
        return res.status(400).json({ success: false, message: 'Please provide valid business location coordinates.' });
      }
    }

    const previousLatitude = hasValue(user.latitude) ? Number(user.latitude) : null;
    const previousLongitude = hasValue(user.longitude) ? Number(user.longitude) : null;
    const locationChanged = BUSINESS_ROLES.has(user.role) &&
      (previousLatitude !== nextLatitude || previousLongitude !== nextLongitude);

    const allowed = ['name','phone','street','city','postalCode','companyName','materialFocus'];
    for (const key of allowed) if (req.body[key] !== undefined) user[key] = req.body[key];
    if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
      user.latitude = nextLatitude;
      user.longitude = nextLongitude;
    }
    if (req.file?.path) user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    await user.save();
    await runSafely('Profile security log skipped', async () => await SecurityLog.create({ userId: user.id, action: locationChanged ? 'Business live location updated' : 'Profile updated', ip: req.ip, device: req.get('user-agent') || null, location: user.city || null }));
    const data = safeUser(user, req); data.address = addressOf(data);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, oldPassword, newPassword } = req.body;
    const current = currentPassword || oldPassword;
    if (!current || !newPassword || String(newPassword).length < 8) return res.status(400).json({ success: false, message: 'Current password and a new password of at least 8 characters are required.' });
    const user = await User.findByPk(req.user.id);
    if (!(await bcrypt.compare(current, user.passwordHash))) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    user.passwordHash = await bcrypt.hash(newPassword, 12); await user.save();
    await runSafely('Password security log skipped', async () => await SecurityLog.create({ userId: user.id, action: 'Password changed', ip: req.ip, device: req.get('user-agent') || null }));
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (e) { next(e); }
};

exports.securityLogs = async (req, res, next) => {
  try {
    const logs = await SecurityLog.findAll({ where: { userId: req.user.id }, order: [['createdAt','DESC']], limit: 20 });
    res.json({ success: true, data: logs.map((log) => formatSecurityLog(log, req.user.city || 'Pakistan')) });
  } catch (e) { next(e); }
};

exports.recentActivities = async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, Math.floor(Number(req.query.limit) || 5)));
    const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0));
    const result = await listRecentActivities({ userId: req.user.id, role: req.user.role, limit, offset });
    res.json({ success: true, ...result, activities: result.data });
  } catch (e) { next(e); }
};

exports.getSellerProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.sellerId, { attributes: { exclude: ['passwordHash','cnic','userPhoto','idCardPhoto','businessApprovalLetter','verificationNote'] } });
    if (!user || !['Supplier','Wholesaler','Retailer'].includes(user.role) || user.status !== 'Active' || user.verificationStatus !== 'Approved') return res.status(404).json({ success: false, message: 'Seller not found.' });
    const payoutMethods = await defaultMethodsForSellers([user.id]);
    const payoutReady = payoutMethods.has(user.id);
    const products = payoutReady ? await Product.findAll({ where: { sellerId: user.id, status: ['Active','OutOfStock'] }, order: [['createdAt','DESC']] }) : [];
    const seller = safeUser(user, req);
    seller.businessName = seller.companyName || seller.name; seller.address = addressOf(seller); delete seller.ntnPhoto;
    const normalizedProducts = products.map((p) => ({ ...p.toJSON(), image: publicFile(req, p.imageUrl), imageUrl: publicFile(req, p.imageUrl), sellerName: seller.businessName, sellerRole: seller.role }));
    res.json({ success: true, user: seller, seller, products: normalizedProducts });
  } catch (e) { next(e); }
};
