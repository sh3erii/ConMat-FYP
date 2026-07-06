const express = require('express');
const router = express.Router();
const integrationHealthController = require('../controllers/integrationHealthController');

router.get('/ping', integrationHealthController.ping);
router.get('/modules', integrationHealthController.modules);
router.get('/smoke', integrationHealthController.smoke);

module.exports = router;
