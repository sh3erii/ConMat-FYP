const r=require('express').Router(),c=require('../controllers/orderController'),p=require('../middleware/authMiddleware');r.get('/:orderIdOrNumber',p,c.tracking);module.exports=r;
