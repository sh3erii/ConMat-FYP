export const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
};

export default formatCurrency;
