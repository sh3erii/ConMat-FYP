const isEmpty = (value) => value === undefined || value === null || String(value).trim() === '';

const validateRequired = (body, fields = []) => {
  return fields
    .filter((field) => isEmpty(body[field]))
    .map((field) => ({ field, message: `${field} is required` }));
};

const validatePositiveNumber = (body, fields = []) => {
  return fields
    .filter((field) => body[field] !== undefined && (Number.isNaN(Number(body[field])) || Number(body[field]) < 0))
    .map((field) => ({ field, message: `${field} must be a positive number` }));
};

const validateEmail = (email) => {
  if (isEmpty(email)) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
};

module.exports = { isEmpty, validateRequired, validatePositiveNumber, validateEmail };
