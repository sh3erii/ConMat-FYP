const { errorResponse } = require('../utils/apiResponse');

const validateRequest = (validator) => (req, res, next) => {
  const errors = validator(req.body || {}, req);
  if (errors && errors.length > 0) {
    return errorResponse(res, 'Validation failed', 400, errors);
  }
  next();
};

module.exports = validateRequest;
