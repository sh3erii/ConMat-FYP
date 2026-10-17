const path = require('path');

function publicFile(req, stored) {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  const normalized = String(stored).replace(/\\/g, '/');
  const rel = normalized.includes('/uploads/') ? normalized.slice(normalized.indexOf('/uploads/')) : normalized.startsWith('/uploads/') ? normalized : `/uploads/${path.basename(normalized)}`;
  return `${req.protocol}://${req.get('host')}${rel}`;
}

function safeUser(user, req) {
  if (!user) return null;
  const u = user.toJSON ? user.toJSON() : { ...user };
  delete u.passwordHash;
  delete u.cnic;
  delete u.stripeConnectedAccountId;
  delete u.stripeDetailsSubmitted;
  delete u.stripePayoutsEnabled;
  delete u.stripeTransfersStatus;
  delete u.stripePayoutCountry;
  u.isVerified = u.verificationStatus === 'Approved' || u.verificationStatus === 'NotRequired';
  if (req) {
    u.profilePhoto = publicFile(req, u.profilePhoto);
    u.userPhoto = publicFile(req, u.userPhoto);
    u.idCardPhoto = publicFile(req, u.idCardPhoto);
    u.ntnPhoto = publicFile(req, u.ntnPhoto);
    u.businessApprovalLetter = publicFile(req, u.businessApprovalLetter);
  }
  return u;
}

function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function dateText(value) { return value ? new Date(value).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : ''; }

module.exports = { publicFile, safeUser, number, dateText };
