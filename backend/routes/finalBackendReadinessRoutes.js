const express = require('express');
const finalBackendReadinessController = require('../controllers/finalBackendReadinessController');

const router = express.Router();

router.get('/health', finalBackendReadinessController.health);
router.get('/modules', finalBackendReadinessController.modules);
router.get('/database-plan', finalBackendReadinessController.databasePlan);

module.exports = router;
