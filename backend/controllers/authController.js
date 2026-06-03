const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    {
      id:    user.id,
      email: user.email,
      role:  user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};


const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, companyName } = req.body;

    // --- Validate required fields ---
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password and role are required.'
      });
    }

    // --- Check allowed roles ---
    const allowedRoles = ['Supplier', 'Wholesaler', 'Retailer', 'Customer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected.'
      });
    }

    // --- Check if email already exists ---
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered. Please log in.'
      });
    }

    // --- Hash password ---
    const salt         = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // --- Suppliers start as Pending (Admin must approve) ---
    const status = role === 'Supplier' ? 'Pending' : 'Active';

    // --- Create user ---
    const newUser = await User.create({
      name,
      email,
      phone:       phone || null,
      passwordHash,
      role,
      status,
      companyName: companyName || null
    });

    // --- Response (never send passwordHash back) ---
    return res.status(201).json({
      success: true,
      message: role === 'Supplier'
        ? 'Supplier account created. Please wait for Admin approval before logging in.'
        : 'Account created successfully. You can now log in.',
      user: {
        id:     newUser.id,
        name:   newUser.name,
        email:  newUser.email,
        role:   newUser.role,
        status: newUser.status
      }
    });

  } catch (error) {
    console.error('Register Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.'
    });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Validate ---
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // --- Find user ---
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // --- Check supplier pending status ---
    if (user.role === 'Supplier' && user.status === 'Pending') {
      return res.status(403).json({
        success: false,
        message: 'Your supplier account is awaiting Admin approval. Please wait.'
      });
    }

    // --- Check if rejected ---
    if (user.status === 'Rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been rejected. Contact support.'
      });
    }

    // --- Compare password ---
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // --- Generate JWT ---
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role
      }
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
};


const getMe = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user });

  } catch (error) {
    console.error('GetMe Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getMe };
