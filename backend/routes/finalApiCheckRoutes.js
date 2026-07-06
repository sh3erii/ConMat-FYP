const express = require('express');
const finalApiCheckController = require('../controllers/finalApiCheckController');
const validateRequest = require('../middleware/validateRequestMiddleware');
const { validateProductCreate } = require('../validators/productValidator');
const { validateCheckoutOrder } = require('../validators/orderValidator');

const router = express.Router();

router.get('/ping', finalApiCheckController.ping);
router.get('/modules', finalApiCheckController.modules);
router.get('/validation-checklist', finalApiCheckController.validationChecklist);
router.post('/validate-product-demo', validateRequest(validateProductCreate), finalApiCheckController.echoValidation);
router.post('/validate-order-demo', validateRequest(validateCheckoutOrder), finalApiCheckController.echoValidation);

module.exports = router;
