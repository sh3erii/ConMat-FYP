const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

module.exports = notFoundHandler;
