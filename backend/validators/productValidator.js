const { validateRequired, validatePositiveNumber } = require('../utils/validateRequest');

const validateProductCreate = (body) => {
  const errors = [
    ...validateRequired(body, ['name', 'category', 'unit', 'retailPrice', 'wholesalePrice']),
    ...validatePositiveNumber(body, ['retailPrice', 'wholesalePrice', 'stock']),
  ];

  if (body.wholesalePrice && body.retailPrice && Number(body.wholesalePrice) > Number(body.retailPrice)) {
    errors.push({ field: 'wholesalePrice', message: 'Wholesale price should not be greater than retail price' });
  }

  return errors;
};

const validateStockUpdate = (body) => {
  return [
    ...validateRequired(body, ['stock']),
    ...validatePositiveNumber(body, ['stock']),
  ];
};

module.exports = { validateProductCreate, validateStockUpdate };
