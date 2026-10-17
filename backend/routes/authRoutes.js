const router = require('express').Router();
const controller = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', upload.fields([
  { name: 'userPhoto', maxCount: 1 },
  { name: 'idCardPhoto', maxCount: 1 },
  { name: 'ntnPhoto', maxCount: 1 },
  { name: 'businessApprovalLetter', maxCount: 1 },
]), controller.register);
router.post('/register/verify-otp', controller.verifyRegistrationOtp);
router.post('/register/resend-otp', controller.resendRegistrationOtp);

router.post('/password/forgot', controller.requestPasswordReset);
router.post('/password/verify-otp', controller.verifyPasswordResetOtp);
router.post('/password/reset', controller.resetPassword);

router.post('/login', controller.login);
router.get('/me', protect, controller.getMe);

module.exports = router;
