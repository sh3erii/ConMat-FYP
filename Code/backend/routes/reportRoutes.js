const router = require('express').Router();
const controller = require('../controllers/reportController');
const protect = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

router.use(protect);
router.get('/options', controller.options);
router.get('/me', controller.mine);
router.get('/platform', role('Admin'), controller.platform);

module.exports = router;
