const router = require('express').Router();
const controller = require('../controllers/profileController');
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);
router.get('/me', controller.getMyProfile);
router.put('/me', upload.single('profilePhoto'), controller.updateMyProfile);
router.put('/change-password', controller.changePassword);
router.get('/recent-activities', controller.recentActivities);
router.get('/security-logs', controller.securityLogs);

module.exports = router;
