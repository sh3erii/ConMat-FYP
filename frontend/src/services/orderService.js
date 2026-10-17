import api from './api';

export const createCheckoutOrder = async (orderPayload) => {
  const { data } = await api.post('/checkout/orders', orderPayload);
  return data;
};

export const getMyOrders = async () => {
  const { data } = await api.get('/checkout/orders/my');
  return data;
};

export const getOrderDetail = async (orderId) => {
  const { data } = await api.get(`/checkout/orders/${orderId}`);
  return data;
};

export const cancelOrder = async (orderId, reason) => {
  try {
    const { data } = await api.patch(`/checkout/orders/${orderId}/cancel`, { reason }, { timeout: 60000 });
    return data;
  } catch (error) {
    const cancellationMayHaveCommitted = !error.response
      || error.code === 'ECONNABORTED'
      || error.response?.status === 409;
    if (cancellationMayHaveCommitted) {
      try {
        const current = await getOrderDetail(orderId);
        const order = current?.order || current?.data;
        if (String(order?.orderStatus || order?.status).toLowerCase() === 'cancelled') {
          return { success: true, reconciled: true, message: 'Order cancelled.', order };
        }
      } catch {
        // Preserve the original cancellation error when reconciliation fails.
      }
    }
    throw error;
  }
};

export const confirmOrderDelivery = async (orderId, note = '') => {
  const { data } = await api.post(`/checkout/orders/${orderId}/confirm-delivery`, { note }, { timeout: 60000 });
  return data;
};

export const confirmItemDelivery = async (orderId, itemId, note = '') => {
  const { data } = await api.post(`/checkout/orders/${orderId}/items/${itemId}/confirm-delivery`, { note }, { timeout: 60000 });
  return data;
};

export const reportOrderIssue = async (orderId, payload) => {
  const { data } = await api.post(`/checkout/orders/${orderId}/report-issue`, payload);
  return data;
};

export const reportItemIssue = async (orderId, itemId, payload) => {
  const { data } = await api.post(`/checkout/orders/${orderId}/items/${itemId}/report-issue`, payload);
  return data;
};

export const getIncomingOrders = async () => {
  const { data } = await api.get('/orders/incoming');
  return data;
};

export const updateOrderStatus = async (orderId, payload) => {
  const { data } = await api.patch(`/orders/${orderId}/status`, payload);
  return data;
};

export const getInvoice = async (orderId) => {
  const { data } = await api.get(`/invoices/${orderId}`);
  return data;
};
