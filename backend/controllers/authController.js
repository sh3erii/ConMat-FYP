const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const SecurityLog = require('../models/SecurityLog');
const { safeUser } = require('../services/formatters');
const { notifySafely, sendDetailedEmail } = require('../services/notificationService');
const { runInBackground, runSafely } = require('../services/asyncService');
const { describeDevice, displayIp, displayDate } = require('../services/securityLogService');

const businessRoles = ['Supplier', 'Wholesaler', 'Retailer'];
const allowedRoles = [...businessRoles, 'Customer'];
const configNumber = (value, fallback, minimum) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.floor(parsed)) : fallback;
};
const otpExpiryMinutes = configNumber(process.env.REGISTRATION_OTP_EXPIRY_MINUTES, 10, 1);
const otpResendSeconds = configNumber(process.env.REGISTRATION_OTP_RESEND_SECONDS, 60, 60);
const otpMaxAttempts = configNumber(process.env.REGISTRATION_OTP_MAX_ATTEMPTS, 5, 3);
const resetOtpExpiryMinutes = configNumber(process.env.PASSWORD_RESET_OTP_EXPIRY_MINUTES, 10, 1);
const resetOtpResendSeconds = configNumber(process.env.PASSWORD_RESET_OTP_RESEND_SECONDS, 60, 60);
const resetOtpMaxAttempts = configNumber(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS, 5, 3);
const pathFor = (req, field) => req.files?.[field]?.[0] ? `/uploads/verification/${req.files[field][0].filename}` : null;
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const secondsUntil = (value) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));

async function logSecurity(req, userId, action, location = req.body?.city || null) {
  return await runSafely('Security log write skipped', async () => await SecurityLog.create({
    userId,
    action,
    ip: req.ip,
    device: req.get('user-agent') || null,
    location,
  }));
}

function tokenFor(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function passwordValidationMessage(password) {
  const passwordText = String(password || '');
  if (passwordText.length < 8 || !/[A-Z]/.test(passwordText) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(passwordText)) {
    return 'Password must be at least 8 characters and include one capital letter and one special character.';
  }
  return '';
}

async function sendRegistrationOtpEmail({ email, name, otp, expiresAt }) {
  return await sendDetailedEmail({
    email,
    title: 'Your registration verification code',
    message: `Hello ${name}, enter this one-time code to finish creating your ConMat account.`,
    details: {
      'Verification code': otp,
      'Valid until': displayDate(expiresAt),
      'Expires in': `${otpExpiryMinutes} minute${otpExpiryMinutes === 1 ? '' : 's'}`,
    },
  });
}

async function sendPasswordResetOtpEmail({ email, name, otp, expiresAt }) {
  return await sendDetailedEmail({
    email,
    title: 'Your password reset code',
    message: `Hello ${name}, use this one-time code to reset your ConMat password. If you did not request this, you can ignore this email.`,
    details: {
      'Reset code': otp,
      'Valid until': displayDate(expiresAt),
      'Expires in': `${resetOtpExpiryMinutes} minute${resetOtpExpiryMinutes === 1 ? '' : 's'}`,
    },
  });
}

async function sendSignupNotifications(user) {
  const registeredAt = displayDate(new Date());
  const isBusiness = businessRoles.includes(user.role);
  const signupDetails = {
    Name: user.name,
    Email: user.email,
    Phone: user.phone || 'Not provided',
    'Account role': user.role,
    Business: user.companyName || 'Not applicable',
    City: user.city || 'Not provided',
    Status: isBusiness ? 'Pending admin approval' : 'Active',
    'Email verification': 'Verified by OTP',
    'Registered at': registeredAt,
  };

  await notifySafely({
    userId: user.id,
    email: user.email,
    title: 'Welcome to ConMat',
    message: isBusiness
      ? 'Your email was verified and your business account is waiting for admin approval.'
      : 'Your email was verified and your ConMat account is ready to use.',
    type: 'Account',
    actionUrl: isBusiness ? '/login' : '/account/profile',
    metadata: { event: 'signup', role: user.role, status: user.status, emailVerified: true },
    emailDetails: signupDetails,
  }, 'Signup user notification skipped');

  const admins = await User.findAll({ where: { role: 'Admin', status: 'Active' }, attributes: ['id', 'email', 'name'] });
  await Promise.all(admins.map(async (admin) => await notifySafely({
      userId: admin.id,
      email: admin.email,
      title: 'New verified user signup',
      message: `${user.name} verified their email and completed ${user.role} registration.${isBusiness ? ' This business account requires admin approval.' : ''}`,
      type: 'Account',
      actionUrl: isBusiness ? '/admin/seller-verification' : '/admin/users',
      metadata: { event: 'user-signup', userId: user.id, role: user.role, emailVerified: true },
      emailDetails: signupDetails,
    }, 'Signup admin notification skipped')));
}

exports.register = async (req, res, next) => {
  try {
    const { name, phone, password, role, companyName, street, city, postalCode, latitude, longitude, materialFocus } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!name || !email || !password || !role) return res.status(400).json({ success: false, message: 'Name, email, password and role are required.' });
    if (!allowedRoles.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
    const passwordText = String(password);
    const passwordIssue = passwordValidationMessage(passwordText);
    if (passwordIssue) return res.status(400).json({ success: false, message: passwordIssue });
    if (await User.findOne({ where: { email } })) return res.status(409).json({ success: false, message: 'Email is already registered.' });

    if (phone) {
      const phoneDigits = String(phone).replace(/\D/g, '');
      if (phoneDigits.length !== 12 || !phoneDigits.startsWith('92')) {
        return res.status(400).json({ success: false, message: 'Phone number must be +92 followed by exactly 10 digits.' });
      }
      const formattedPhone = `+${phoneDigits}`;
      const existingPhone = await User.findOne({ where: { phone: { [Op.in]: [phone, formattedPhone, phoneDigits] } } });
      if (existingPhone) return res.status(409).json({ success: false, message: 'Phone number is already registered.' });
    }

    if (!pathFor(req, 'idCardPhoto')) {
      return res.status(400).json({ success: false, message: 'A live photo of your ID card is required for all accounts.' });
    }

    if (businessRoles.includes(role)) {
      if (!pathFor(req, 'userPhoto')) return res.status(400).json({ success: false, message: 'A live selfie is required for business accounts.' });
      if (!companyName) return res.status(400).json({ success: false, message: 'Company name is required for business accounts.' });
      if (!pathFor(req, 'ntnPhoto') && !pathFor(req, 'businessApprovalLetter')) {
        return res.status(400).json({ success: false, message: 'An NTN document or business letter is required for every business account.' });
      }
      if (latitude === undefined || latitude === null || latitude === '' || longitude === undefined || longitude === null || longitude === '') {
        return res.status(400).json({ success: false, message: 'Business location coordinates (latitude and longitude) are compulsory for business accounts.' });
      }
      const parsedLatitude = Number(latitude);
      const parsedLongitude = Number(longitude);
      if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90 ||
          !Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
        return res.status(400).json({ success: false, message: 'Please provide valid business location coordinates.' });
      }
    }

    let pending = await PendingRegistration.findOne({ where: { email } });
    if (pending && secondsUntil(pending.resendAvailableAt) > 0) {
      const retryAfterSeconds = secondsUntil(pending.resendAvailableAt);
      return res.status(429).json({ success: false, message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`, retryAfterSeconds });
    }

    const isBusiness = businessRoles.includes(role);
    const registrationData = {
      name: String(name).trim(),
      email,
      phone: phone || null,
      role,
      status: isBusiness ? 'Pending' : 'Active',
      verificationStatus: role === 'Customer' ? 'NotRequired' : 'Pending',
      companyName: companyName || null,
      street: street || null,
      city: city || null,
      postalCode: postalCode || null,
      latitude: isBusiness ? Number(latitude) : null,
      longitude: isBusiness ? Number(longitude) : null,
      materialFocus: materialFocus || null,
      userPhoto: pathFor(req, 'userPhoto'),
      idCardPhoto: pathFor(req, 'idCardPhoto'),
      ntnPhoto: pathFor(req, 'ntnPhoto'),
      businessApprovalLetter: pathFor(req, 'businessApprovalLetter'),
    };
    const otp = generateOtp();
    const now = Date.now();
    const otpExpiresAt = new Date(now + otpExpiryMinutes * 60 * 1000);
    const resendAvailableAt = new Date(now + otpResendSeconds * 1000);
    const [passwordHash, otpHash] = await Promise.all([bcrypt.hash(passwordText, 12), bcrypt.hash(otp, 10)]);
    const pendingValues = { registrationData, passwordHash, otpHash, otpExpiresAt, resendAvailableAt, attempts: 0 };

    if (pending) await pending.update(pendingValues);
    else pending = await PendingRegistration.create({ email, ...pendingValues });

    try {
      await sendRegistrationOtpEmail({ email, name: registrationData.name, otp, expiresAt: otpExpiresAt });
    } catch (emailError) {
      await runSafely('OTP resend reset skipped', async () => await pending.update({ resendAvailableAt: new Date() }));
      throw Object.assign(new Error('Unable to send the verification code. Please try again.'), { status: 503, cause: emailError });
    }

    res.status(202).json({
      success: true,
      requiresOtp: true,
      email,
      resendAfterSeconds: otpResendSeconds,
      otpExpiresInSeconds: otpExpiryMinutes * 60,
      message: `A 6-digit verification code was sent to ${email}.`,
    });
  } catch (e) { next(e); }
};

exports.verifyRegistrationOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    if (!email || !/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: 'Email and a valid 6-digit code are required.' });

    const pending = await PendingRegistration.findOne({ where: { email } });
    if (!pending) return res.status(404).json({ success: false, message: 'No pending registration was found. Please submit the signup form again.' });
    if (pending.attempts >= otpMaxAttempts) return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Request a new code to continue.' });
    if (new Date(pending.otpExpiresAt).getTime() <= Date.now()) return res.status(410).json({ success: false, message: 'This verification code has expired. Request a new code.' });

    const valid = await bcrypt.compare(otp, pending.otpHash);
    if (!valid) {
      const attempts = pending.attempts + 1;
      await pending.update({ attempts });
      const remainingAttempts = Math.max(0, otpMaxAttempts - attempts);
      return res.status(remainingAttempts ? 400 : 429).json({
        success: false,
        message: remainingAttempts ? `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.` : 'Too many incorrect attempts. Request a new code to continue.',
        remainingAttempts,
      });
    }

    const registrationData = pending.registrationData;
    if (await User.findOne({ where: { email } })) {
      await pending.destroy();
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }
    if (registrationData.phone) {
      const phoneDigits = String(registrationData.phone).replace(/\D/g, '');
      const existingPhone = await User.findOne({ where: { phone: { [Op.in]: [registrationData.phone, `+${phoneDigits}`, phoneDigits] } } });
      if (existingPhone) return res.status(409).json({ success: false, message: 'Phone number is already registered.' });
    }

    let user;
    await User.sequelize.transaction(async (transaction) => {
      user = await User.create({ ...registrationData, passwordHash: pending.passwordHash }, { transaction });
      await pending.destroy({ transaction });
    });

    res.status(201).json({
      success: true,
      message: businessRoles.includes(user.role) ? 'Email verified. Your business account now requires admin approval.' : 'Email verified and account created successfully.',
      user: safeUser(user, req),
    });


    runInBackground('Post-registration work failed', async () => {
      await Promise.all([
        logSecurity(req, user.id, 'Account registered', user.city || null),
        sendSignupNotifications(user),
      ]);
    });
  } catch (e) { next(e); }
};

exports.resendRegistrationOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
    const pending = await PendingRegistration.findOne({ where: { email } });
    if (!pending) return res.status(404).json({ success: false, message: 'No pending registration was found. Please submit the signup form again.' });
    if (await User.findOne({ where: { email } })) {
      await pending.destroy();
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }
    const retryAfterSeconds = secondsUntil(pending.resendAvailableAt);
    if (retryAfterSeconds > 0) {
      return res.status(429).json({ success: false, message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`, retryAfterSeconds });
    }

    const otp = generateOtp();
    const now = Date.now();
    const otpExpiresAt = new Date(now + otpExpiryMinutes * 60 * 1000);
    const resendAvailableAt = new Date(now + otpResendSeconds * 1000);
    await pending.update({ otpHash: await bcrypt.hash(otp, 10), otpExpiresAt, resendAvailableAt, attempts: 0 });
    try {
      await sendRegistrationOtpEmail({ email, name: pending.registrationData.name, otp, expiresAt: otpExpiresAt });
    } catch (emailError) {
      await runSafely('OTP resend reset skipped', async () => await pending.update({ resendAvailableAt: new Date() }));
      throw Object.assign(new Error('Unable to resend the verification code. Please try again.'), { status: 503, cause: emailError });
    }

    res.json({
      success: true,
      email,
      resendAfterSeconds: otpResendSeconds,
      otpExpiresInSeconds: otpExpiryMinutes * 60,
      message: `A new 6-digit verification code was sent to ${email}.`,
    });
  } catch (e) { next(e); }
};

exports.requestPasswordReset = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const genericResponse = {
      success: true,
      email,
      resendAfterSeconds: resetOtpResendSeconds,
      otpExpiresInSeconds: resetOtpExpiryMinutes * 60,
      message: 'If an account exists for this email, a 6-digit reset code has been sent.',
    };
    const user = await User.findOne({ where: { email }, attributes: ['id', 'email', 'name'] });
    if (!user) {
      await runSafely('Orphaned password reset cleanup skipped', async () => {
        await PasswordResetOtp.destroy({ where: { email } });
      });
      return res.json(genericResponse);
    }

    let pending = await PasswordResetOtp.findOne({ where: { email } });
    if (pending) {
      const retryAfterSeconds = secondsUntil(pending.resendAvailableAt);
      if (retryAfterSeconds > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          retryAfterSeconds,
        });
      }
    }

    const otp = generateOtp();
    const now = Date.now();
    const otpExpiresAt = new Date(now + resetOtpExpiryMinutes * 60 * 1000);
    const resendAvailableAt = new Date(now + resetOtpResendSeconds * 1000);
    const values = {
      otpHash: await bcrypt.hash(otp, 10),
      otpExpiresAt,
      resendAvailableAt,
      attempts: 0,
    };

    if (pending) await pending.update(values);
    else pending = await PasswordResetOtp.create({ email, ...values });

    try {
      await sendPasswordResetOtpEmail({ email, name: user.name, otp, expiresAt: otpExpiresAt });
    } catch (emailError) {
      await runSafely('Password reset resend reset skipped', async () => {
        await pending.update({ resendAvailableAt: new Date() });
      });
      throw Object.assign(new Error('Unable to send the reset code. Please try again.'), { status: 503, cause: emailError });
    }

    return res.json(genericResponse);
  } catch (error) {
    return next(error);
  }
};

exports.verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Email and a valid 6-digit code are required.' });
    }

    const pending = await PasswordResetOtp.findOne({ where: { email } });
    if (!pending) return res.status(400).json({ success: false, message: 'Invalid or expired reset code. Request a new code.' });
    if (pending.attempts >= resetOtpMaxAttempts) {
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Request a new code to continue.' });
    }
    if (new Date(pending.otpExpiresAt).getTime() <= Date.now()) {
      return res.status(410).json({ success: false, message: 'This reset code has expired. Request a new code.' });
    }

    const valid = await bcrypt.compare(otp, pending.otpHash);
    if (!valid) {
      const attempts = pending.attempts + 1;
      await pending.update({ attempts });
      const remainingAttempts = Math.max(0, resetOtpMaxAttempts - attempts);
      return res.status(remainingAttempts ? 400 : 429).json({
        success: false,
        message: remainingAttempts
          ? `Incorrect reset code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Request a new code to continue.',
        remainingAttempts,
      });
    }

    const user = await User.findOne({ where: { email }, attributes: ['id', 'email'] });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset code. Request a new code.' });
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');

    const otpVersion = crypto.createHash('sha256').update(pending.otpHash).digest('hex');
    const resetToken = jwt.sign({
      id: user.id,
      email,
      purpose: 'password-reset',
      resetId: pending.id,
      otpVersion,
    }, process.env.JWT_SECRET, { expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '10m' });

    return res.json({
      success: true,
      resetToken,
      message: 'Code verified. You can now choose a new password.',
    });
  } catch (error) {
    return next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const resetToken = String(req.body.resetToken || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    if (!resetToken) return res.status(400).json({ success: false, message: 'Reset verification is required.' });
    const passwordIssue = passwordValidationMessage(newPassword);
    if (passwordIssue) return res.status(400).json({ success: false, message: passwordIssue });
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password must match.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Your password reset session has expired. Request a new code.' });
    }
    if (decoded.purpose !== 'password-reset' || !decoded.resetId || !decoded.email || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid password reset session.' });
    }

    const pending = await PasswordResetOtp.findOne({ where: { id: decoded.resetId, email: decoded.email } });
    if (!pending) return res.status(401).json({ success: false, message: 'This reset link has already been used or expired.' });
    const otpVersion = crypto.createHash('sha256').update(pending.otpHash).digest('hex');
    if (otpVersion !== decoded.otpVersion) {
      return res.status(401).json({ success: false, message: 'A newer reset code was requested. Verify the newest code.' });
    }

    const user = await User.findOne({ where: { id: decoded.id, email: decoded.email } });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.status(400).json({ success: false, message: 'Choose a password different from your current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.sequelize.transaction(async (transaction) => {
      await user.update({ passwordHash }, { transaction });
      await pending.destroy({ transaction });
    });

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    runInBackground('Password reset follow-up failed', async () => {
      await Promise.all([
        logSecurity(req, user.id, 'Password reset by email OTP', user.city || null),
        sendDetailedEmail({
          email: user.email,
          title: 'Your password was changed',
          message: 'Your ConMat password was reset successfully. If you did not make this change, contact ConMat support immediately.',
          details: {
            Time: displayDate(new Date()),
            Device: describeDevice(req.get('user-agent')),
            'IP address': displayIp(req.ip),
          },
        }),
      ]);
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });
    const user = await User.findOne({ where: { email: normalizeEmail(email) } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (user.status === 'Rejected') return res.status(403).json({ success: false, message: 'Your account has been rejected. Contact support.' });
    if (businessRoles.includes(user.role) && user.verificationStatus !== 'Approved') return res.status(403).json({ success: false, message: 'Your business account is awaiting Admin approval.' });
    if (user.status === 'Pending') return res.status(403).json({ success: false, message: 'Your account is awaiting Admin approval.' });
    const token = tokenFor(user);
    await logSecurity(req, user.id, 'Login');
    res.json({ success: true, message: 'Login successful.', token, user: safeUser(user, req) });

    runInBackground('Login alert email failed', async () => {
      await sendDetailedEmail({
        email: user.email,
        title: user.role === 'Admin' ? 'Administrator login alert' : 'Login alert',
        message: `A successful login to your ${user.role} account was recorded. If this was not you, change your password immediately.`,
        actionUrl: '/account/settings',
        details: {
          Account: user.email,
          Role: user.role,
          Time: displayDate(new Date()),
          Device: describeDevice(req.get('user-agent')),
          'IP address': displayIp(req.ip),
          Location: user.city || 'Pakistan',
        },
      });
    });
  } catch (e) { next(e); }
};

exports.getMe = async (req, res) => res.json({ success: true, user: safeUser(req.user, req) });
