module.exports = (...roles) => {
  const allowed = Array.isArray(roles[0]) ? roles[0] : roles;
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ success: false, message: `Access restricted to: ${allowed.join(', ')}.` });
    next();
  };
};
