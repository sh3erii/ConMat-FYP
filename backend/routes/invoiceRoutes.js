// ============================================================
//  routes/invoiceRoutes.js
//  Owner: Muhammad Nosherwan (076926)
//  Day 5 – invoice routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const invoiceController = require('../controllers/invoiceController');

const invoiceRoles = ['Admin', 'Customer', 'Retailer', 'Wholesaler', 'Supplier'];

router.get('/:orderId', protect, authorize(...invoiceRoles), invoiceController.getInvoiceByOrder);

// Printable route is left public for easy demo printing from frontend href.
// Before deployment, protect it with JWT or a signed invoice token.
router.get('/:orderId/print', invoiceController.printInvoiceByOrder);

router.post('/:orderId/email', protect, authorize(...invoiceRoles), invoiceController.emailInvoiceByOrder);

module.exports = router;
