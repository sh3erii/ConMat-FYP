const express = require('express');
const finalAdminQaController = require('../controllers/finalAdminQaController');

const router = express.Router();

router.get('/checklist', finalAdminQaController.checklist);
router.get('/issues', finalAdminQaController.issues);
router.post('/issues', finalAdminQaController.createIssue);

module.exports = router;
