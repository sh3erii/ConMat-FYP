const r = require('express').Router();
const c = require('../controllers/profileController');

r.get('/:sellerId', c.getSellerProfile);

module.exports = r;
