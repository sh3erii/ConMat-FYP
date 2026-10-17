const router = require('express').Router();
const controller = require('../controllers/paymentController');
const connectController = require('../controllers/connectController');
const protect = require('../middleware/authMiddleware');

router.post('/create-intent', protect, controller.createIntent);
router.post('/confirm-intent', protect, controller.confirmIntent);
router.get('/connect/status', protect, connectController.status);
router.post('/connect/onboarding-link', protect, connectController.onboardingLink);
router.post('/connect/dashboard-link', protect, connectController.dashboardLink);

module.exports = router;
