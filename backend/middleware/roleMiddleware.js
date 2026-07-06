const authorize = (...roles) => {
  const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;

  return (req, res, next) => {
    // req.user is set by authMiddleware (protect)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
};

module.exports = authorize;
