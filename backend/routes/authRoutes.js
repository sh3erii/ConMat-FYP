const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const { register, login, getMe } = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me  (protected – must be logged in)
router.get('/me', protect, getMe);

module.exports = router;
