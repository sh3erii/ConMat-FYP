const ProductPerformanceSnapshot = require('../models/ProductPerformanceSnapshot');

function getSupplierId(req) {
  return req.user?.id || req.user?.userId || req.query.supplierId || req.body.supplierId || 1;
}

function getStatus(stock, orders) {
  if (Number(stock) <= 15) return 'Low Stock';
  if (Number(orders) >= 25) return 'Strong';
  return 'Watch';
}

async function rebuildProductPerformanceSnapshots(req) {
  const supplierId = getSupplierId(req);

  // This fallback creates realistic seed snapshots for Day 12 testing.
  // After Product/OrderItem associations are finalized, replace this with live aggregation.
  const seedProducts = [
    { productId: 1, productName: 'Maple Leaf Cement 50kg', category: 'Cement', views: 5400, orders: 148, soldUnits: 4400, revenue: 2640000, stock: 850, rating: 4.8 },
    { productId: 2, productName: 'Grade 60 Steel Bar 12mm', category: 'Steel', views: 4210, orders: 92, soldUnits: 610, revenue: 1985000, stock: 120, rating: 4.7 },
    { productId: 3, productName: 'Chenab Crush Aggregate', category: 'Aggregate', views: 2300, orders: 43, soldUnits: 305, revenue: 1220000, stock: 58, rating: 4.5 },
    { productId: 4, productName: 'Fine Sand Truck Load', category: 'Sand', views: 1800, orders: 31, soldUnits: 75, revenue: 780000, stock: 12, rating: 4.3 },
    { productId: 5, productName: 'Floor Tile Premium Box', category: 'Tiles', views: 1560, orders: 28, soldUnits: 220, revenue: 620000, stock: 9, rating: 4.2 },
  ];

  const created = [];
  for (const item of seedProducts) {
    const snapshot = await ProductPerformanceSnapshot.create({
      ...item,
      supplierId,
      status: getStatus(item.stock, item.orders),
      snapshotDate: new Date(),
    });
    created.push(snapshot);
  }

  return created;
}

async function getProductPerformance(req) {
  const supplierId = getSupplierId(req);
  let products = await ProductPerformanceSnapshot.findAll({
    where: { supplierId },
    order: [['revenue', 'DESC']],
    limit: 20,
  });

  if (!products.length) {
    products = await rebuildProductPerformanceSnapshots(req);
  }

  const normalized = products.map((item) => {
    const plain = item.toJSON ? item.toJSON() : item;
    return {
      id: plain.productId,
      name: plain.productName,
      category: plain.category,
      views: Number(plain.views || 0),
      orders: Number(plain.orders || 0),
      soldUnits: Number(plain.soldUnits || 0),
      revenue: Number(plain.revenue || 0),
      stock: Number(plain.stock || 0),
      rating: Number(plain.rating || 0),
      status: plain.status,
    };
  });

  return {
    products: normalized,
    topProducts: normalized.slice(0, 3).map((product, index) => ({
      ...product,
      growth: [18, 11, 9][index] || 5,
      image: [
        'https://images.unsplash.com/photo-1605152276897-4f618f831968?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop',
      ][index],
    })),
  };
}

async function getStockHealth(req) {
  const { products } = await getProductPerformance(req);
  const stockHealth = products.reduce((acc, product) => {
    if (product.status === 'Low Stock') acc.low += 1;
    else if (product.status === 'Strong') acc.healthy += 1;
    else acc.watch += 1;
    return acc;
  }, { healthy: 0, watch: 0, low: 0 });

  stockHealth.recommendations = [
    'Restock low-stock products before accepting new bulk bids.',
    'Review products with high views but low orders for price adjustment.',
    'Keep strong products visible in marketplace featured materials.',
  ];

  return { stockHealth };
}

module.exports = {
  rebuildProductPerformanceSnapshots,
  getProductPerformance,
  getStockHealth,
};
