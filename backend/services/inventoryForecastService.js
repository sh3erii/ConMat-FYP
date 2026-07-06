const InventoryForecast = require('../models/InventoryForecast');

let Product;
try {
  Product = require('../models/Product');
} catch (error) {
  Product = null;
}

function buildForecastPayload(product, options = {}) {
  const periodDays = Number(options.periodDays || 30);
  const currentStock = Number(product.stockQuantity ?? product.stock ?? product.currentStock ?? 0);
  const averageDailySales = Number(options.averageDailySales || product.averageDailySales || product.monthlySoldUnits / 30 || 1);
  const forecastedDemand = Math.ceil(averageDailySales * periodDays);
  const daysUntilStockout = averageDailySales > 0 ? Math.floor(currentStock / averageDailySales) : null;
  const productName = product.name || product.productName || 'Construction Material';

  let recommendation = 'Stock level is stable.';
  if (daysUntilStockout !== null && daysUntilStockout <= 7) {
    recommendation = 'Urgent restock required within this week.';
  } else if (forecastedDemand > currentStock) {
    recommendation = 'Restock before the end of the forecast period.';
  }

  return {
    productId: product.id,
    productName,
    sku: product.sku || product.productCode || null,
    currentStock,
    averageDailySales,
    forecastedDemand,
    daysUntilStockout,
    periodDays,
    confidence: Number(options.confidence || 0.75),
    recommendation,
  };
}

async function generateForecasts(query = {}) {
  if (!Product) {
    return [];
  }

  const products = await Product.findAll({ limit: Number(query.limit || 100) });
  const forecasts = [];

  for (const product of products) {
    const payload = buildForecastPayload(product, query);
    const [forecast] = await InventoryForecast.findOrCreate({
      where: { productId: product.id, periodDays: payload.periodDays },
      defaults: payload,
    });

    await forecast.update(payload);
    forecasts.push(forecast);
  }

  return forecasts;
}

async function listForecasts(query = {}) {
  const where = {};
  if (query.productId) where.productId = query.productId;

  return InventoryForecast.findAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit: Number(query.limit || 50),
  });
}

async function getProductForecast(productId, query = {}) {
  let forecast = await InventoryForecast.findOne({
    where: { productId },
    order: [['updatedAt', 'DESC']],
  });

  if (!forecast && Product) {
    const product = await Product.findByPk(productId);
    if (!product) throw new Error('Product not found for forecast.');
    const payload = buildForecastPayload(product, query);
    forecast = await InventoryForecast.create(payload);
  }

  if (!forecast) throw new Error('Forecast not found.');
  return forecast;
}

module.exports = {
  generateForecasts,
  listForecasts,
  getProductForecast,
};
