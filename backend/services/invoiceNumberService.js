function generateInvoiceNumber(prefix = 'CM-INV') {
  const year = new Date().getFullYear();
  const datePart = new Date().toISOString().slice(5, 10).replace('-', '');
  const random = Math.floor(Math.random() * 90000 + 10000);
  return `${prefix}-${year}${datePart}-${random}`;
}

function formatPKR(amount = 0) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

module.exports = {
  generateInvoiceNumber,
  formatPKR,
};
