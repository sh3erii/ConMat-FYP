const apiErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

module.exports = apiErrorHandler;
