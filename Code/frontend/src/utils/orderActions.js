const normalizedOrderStatus = (order) => String(order?.orderStatus || order?.status || 'Placed').toUpperCase();
const normalizedPaymentStatus = (order) => String(order?.paymentStatus || 'Pending').toUpperCase();

export const isOrderPaid = (order) => normalizedPaymentStatus(order) === 'PAID';
export const isOrderCancelled = (order) => normalizedOrderStatus(order) === 'CANCELLED';

export const canProceedToOrderPayment = (order) => (
  Boolean(order?.id) && !isOrderPaid(order) && !isOrderCancelled(order)
);

export const canCancelBuyerOrder = (order) => {
  const status = normalizedOrderStatus(order);
  return Boolean(order?.id)
    && !isOrderPaid(order)
    && !['CANCELLED', 'DISPATCHED', 'DELIVERED'].includes(status);
};

