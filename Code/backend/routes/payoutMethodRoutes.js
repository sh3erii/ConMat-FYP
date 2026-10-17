const router = require('express').Router();
const controller = require('../controllers/payoutMethodController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:methodId/default', controller.makeDefault);
router.delete('/:methodId', controller.remove);

module.exports = router;
