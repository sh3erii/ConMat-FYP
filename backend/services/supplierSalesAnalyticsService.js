const SupplierSalesMetric = require('../models/SupplierSalesMetric');
const { getProductPerformance, getStockHealth } = require('./productPerformanceService');

function getSupplierId(req) {
  return req.user?.id || req.user?.userId || req.query.supplierId || req.body.supplierId || 1;
}

async function seedSalesMetrics(req) {
  const supplierId = getSupplierId(req);
  const now = new Date();
  const data = [
    { periodLabel: 'Jan', totalRevenue: 820000, totalOrders: 32, fulfilledOrders: 28, cancelledOrders: 2, averageOrderValue: 25625, repeatBuyers: 12 },
    { periodLabel: 'Feb', totalRevenue: 940000, totalOrders: 38, fulfilledOrders: 34, cancelledOrders: 1, averageOrderValue: 24736, repeatBuyers: 16 },
    { periodLabel: 'Mar', totalRevenue: 1080000, totalOrders: 43, fulfilledOrders: 39, cancelledOrders: 2, averageOrderValue: 25116, repeatBuyers: 18 },
    { periodLabel: 'Apr', totalRevenue: 1215000, totalOrders: 51, fulfilledOrders: 47, cancelledOrders: 1, averageOrderValue: 23823, repeatBuyers: 20 },
    { periodLabel: 'May', totalRevenue: 1580000, totalOrders: 67, fulfilledOrders: 60, cancelledOrders: 3, averageOrderValue: 23582, repeatBuyers: 25 },
    { periodLabel: 'Jun', totalRevenue: 2205000, totalOrders: 87, fulfilledOrders: 73, cancelledOrders: 4, averageOrderValue: 25344, repeatBuyers: 31 },
  ];

  const created = [];
  for (let index = 0; index < data.length; index += 1) {
    const periodStart = new Date(now.getFullYear(), index, 1);
    const periodEnd = new Date(now.getFullYear(), index + 1, 0);
    const metric = await SupplierSalesMetric.create({
      supplierId,
      ...data[index],
      periodStart,
      periodEnd,
    });
    created.push(metric);
  }

  return created;
}

async function getSalesTrend(req) {
  const supplierId = getSupplierId(req);
  let metrics = await SupplierSalesMetric.findAll({
    where: { supplierId },
    order: [['periodStart', 'ASC']],
    limit: 12,
  });

  if (!metrics.length) {
    metrics = await seedSalesMetrics(req);
  }

  return {
    salesTrend: metrics.map((metric) => {
      const plain = metric.toJSON ? metric.toJSON() : metric;
      return {
        label: plain.periodLabel,
        revenue: Number(plain.totalRevenue || 0),
        orders: Number(plain.totalOrders || 0),
      };
    }),
  };
}

async function getSupplierOverview(req) {
  const { salesTrend } = await getSalesTrend(req);
  const { products } = await getProductPerformance(req);
  const { stockHealth } = await getStockHealth(req);

  const totalRevenue = salesTrend.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const totalOrders = salesTrend.reduce((sum, item) => sum + Number(item.orders || 0), 0);
  const fulfilledOrders = Math.round(totalOrders * 0.88);
  const cancelledOrders = Math.max(totalOrders - fulfilledOrders - 24, 0);

  return {
    overview: {
      totalRevenue,
      totalOrders,
      fulfilledOrders,
      pendingOrders: Math.max(totalOrders - fulfilledOrders - cancelledOrders, 0),
      cancelledOrders,
      averageOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      repeatBuyers: 91,
      conversionRate: 68,
      lowStockProducts: stockHealth.low,
      activeProducts: products.length,
    },
  };
}

module.exports = {
  getSupplierOverview,
  getSalesTrend,
  seedSalesMetrics,
};
