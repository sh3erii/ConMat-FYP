const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['passwordHash'] } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account is unavailable.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: user.status === 'Pending' ? 'Account is awaiting admin review.' : 'Account is unavailable.' });
    }
    if (['Supplier', 'Wholesaler', 'Retailer'].includes(user.role) && user.verificationStatus !== 'Approved') {
      return res.status(403).json({ success: false, message: 'Business account is awaiting admin approval.' });
    }
    req.user = user.toJSON();
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token. Access denied.' });
  }
};
