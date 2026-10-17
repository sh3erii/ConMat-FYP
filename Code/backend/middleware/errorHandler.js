module.exports = (err, req, res, next) => {
  console.error(err);
  if (err.name === 'MulterError') return res.status(400).json({ success: false, message: err.message });
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ success: false, message: err.errors?.[0]?.message || err.message });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error.' });
};
