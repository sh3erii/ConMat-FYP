function generateOrderNumber(prefix = 'CM-ORD') {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${year}-${timestamp}${random}`;
}

function calculateOrderTotals(items = []) {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || item.price || 0);
    return sum + quantity * unitPrice;
  }, 0);

  const deliveryFee = subtotal > 500000 ? 0 : 6500;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + tax;

  return { subtotal, deliveryFee, tax, total };
}

module.exports = {
  generateOrderNumber,
  calculateOrderTotals,
};
