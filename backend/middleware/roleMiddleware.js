// ============================================================
//  middleware/roleMiddleware.js  (Hafiz Abdul Rehman – 077011)
//  Restricts routes to specific user roles
//  Usage: router.get('/admin-only', protect, authorize('Admin'), handler)
//         router.get('/multi',      protect, authorize('Admin', 'Supplier'), handler)
// ============================================================

const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user is set by authMiddleware (protect)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${roles.join(', ')}.`
      });
    }

    next();
  };
};

module.exports = authorize;
