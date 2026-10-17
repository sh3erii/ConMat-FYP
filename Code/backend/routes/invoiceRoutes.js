const router = require('express').Router();
const controller = require('../controllers/invoiceController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, controller.listMine);
router.get('/:identifier', protect, controller.getInvoice);

module.exports = router;
