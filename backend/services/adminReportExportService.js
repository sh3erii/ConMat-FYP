function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function toCsv(rows = [], columns = []) {
  const header = columns.map((column) => escapeCsv(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(',')).join('\n');
  return [header, body].filter(Boolean).join('\n');
}

function exportProductsCsv(products = []) {
  return toCsv(products, [
    { key: 'id', label: 'Product ID' },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'sellerName', label: 'Seller' },
    { key: 'city', label: 'City' },
    { key: 'retailPrice', label: 'Retail Price' },
    { key: 'wholesalePrice', label: 'Wholesale Price' },
    { key: 'stock', label: 'Stock' },
    { key: 'status', label: 'Status' },
  ]);
}

function exportOrdersCsv(orders = []) {
  return toCsv(orders, [
    { key: 'id', label: 'Order ID' },
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'buyerName', label: 'Buyer' },
    { key: 'sellerName', label: 'Seller' },
    { key: 'city', label: 'City' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'orderStatus', label: 'Order Status' },
  ]);
}

module.exports = {
  exportProductsCsv,
  exportOrdersCsv,
};
