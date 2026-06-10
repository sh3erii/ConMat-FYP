const express = require('express');
const router = express.Router();
const notificationPreferenceController = require('../controllers/notificationPreferenceController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, notificationPreferenceController.getMyPreferences);
router.put('/me', authMiddleware, notificationPreferenceController.updateMyPreferences);
router.post('/test', authMiddleware, notificationPreferenceController.sendTestNotification);

module.exports = router;
