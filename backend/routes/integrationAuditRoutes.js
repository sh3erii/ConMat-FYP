const express = require('express');
const router = express.Router();
const integrationAuditController = require('../controllers/integrationAuditController');
// const authMiddleware = require('../middleware/authMiddleware');
// const roleMiddleware = require('../middleware/roleMiddleware');

// Add authMiddleware and roleMiddleware(['admin']) after your existing middleware is finalized.
router.get('/role-matrix', integrationAuditController.roleMatrix);
router.get('/protected-routes', integrationAuditController.protectedRoutes);
router.post('/rebuild-role-audit', integrationAuditController.rebuildRoleAudit);
router.get('/smoke-summary', integrationAuditController.smokeSummary);

module.exports = router;
