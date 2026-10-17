const { Op } = require('sequelize');
const { Order, OrderItem, Product } = require('../models');
const { number } = require('../services/formatters');

async function sellerItems(userId) { return OrderItem.findAll({ where: { sellerId: userId }, order: [['createdAt','DESC']] }); }
function inventoryState(product) {
  const stock = Math.max(0, Math.floor(number(product.stock)));
  const minimumQuantity = Math.max(1, Math.floor(number(product.minWholesaleQty) || 1));
  const normalizedStatus = String(product.status || '').replace(/[\s_-]/g, '').toLowerCase();
  if (stock === 0 || normalizedStatus === 'outofstock') return 'out';
  return stock < minimumQuantity ? 'low' : 'healthy';
}
exports.overview = async (req,res,next)=>{ try { const items=await sellerItems(req.user.id);const orderIds=[...new Set(items.map(i=>i.orderId))];const orders=orderIds.length?await Order.findAll({where:{id:{[Op.in]:orderIds}}}):[];const paidIds=new Set(orders.filter(o=>o.paymentStatus==='Paid').map(o=>o.id));const revenue=items.filter(i=>paidIds.has(i.orderId)).reduce((s,i)=>s+number(i.lineTotal),0);const productRows=await Product.findAll({where:{sellerId:req.user.id}});const low=productRows.filter(product=>inventoryState(product)==='low').length;res.json({success:true,data:{overview:{totalRevenue:revenue,totalOrders:orderIds.length,activeProducts:productRows.length,lowStockProducts:low,averageOrderValue:orderIds.length?Math.round(revenue/orderIds.length):0}}}); }catch(e){next(e);} };
exports.salesTrend = async (req,res,next)=>{ try { const items=await sellerItems(req.user.id);const rows=[];for(let i=5;i>=0;i--){const start=new Date();start.setMonth(start.getMonth()-i,1);start.setHours(0,0,0,0);const end=new Date(start);end.setMonth(end.getMonth()+1);const subset=items.filter(x=>x.createdAt>=start&&x.createdAt<end);rows.push({label:start.toLocaleString('en-US',{month:'short'}),revenue:subset.reduce((s,x)=>s+number(x.lineTotal),0),orders:new Set(subset.map(x=>x.orderId)).size});}res.json({success:true,data:{salesTrend:rows}}); }catch(e){next(e);} };
exports.productPerformance = async (req,res,next)=>{ try { const items=await sellerItems(req.user.id);const products=await Product.findAll({where:{sellerId:req.user.id}});const data=products.map(p=>{const sold=items.filter(i=>i.productId===p.id);return{id:p.id,name:p.name,category:p.category,stock:p.stock,unitsSold:sold.reduce((s,i)=>s+i.quantity,0),revenue:sold.reduce((s,i)=>s+number(i.lineTotal),0)};}).sort((a,b)=>b.revenue-a.revenue);res.json({success:true,data:{products:data,topProducts:data.slice(0,5)}}); }catch(e){next(e);} };
exports.stockHealth = async (req,res,next)=>{ try { const products=await Product.findAll({where:{sellerId:req.user.id}});const low=products.filter(product=>inventoryState(product)==='low');const out=products.filter(product=>inventoryState(product)==='out');const healthy=products.filter(product=>inventoryState(product)==='healthy');res.json({success:true,data:{stockHealth:{totalProducts:products.length,inStock:healthy.length,lowStock:low.length,outOfStock:out.length,alerts:low.map(p=>({id:p.id,name:p.name,stock:p.stock,unit:p.unit,minimumQuantity:p.minWholesaleQty}))}}}); }catch(e){next(e);} };
exports.rebuild = async (req,res)=>res.json({success:true,message:'Live analytics do not require snapshot rebuilding.',data:{rebuiltAt:new Date()}});
