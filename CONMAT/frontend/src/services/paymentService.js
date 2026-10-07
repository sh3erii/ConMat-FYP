import api from './api';

export async function getPaymentOrder(orderId) {
  const response = await api.get(`/orders/${orderId}/payment-summary`);
  return response.data?.data || response.data;
}

export async function createPaymentIntent(orderId) {
  const response = await api.post('/stripe-payments/create-intent', { orderId }, { timeout: 60000 });
  return response.data?.data || response.data;
}

export async function confirmPaymentIntent(orderId, paymentIntentId) {
  const response = await api.post('/stripe-payments/confirm-intent', { orderId, paymentIntentId }, { timeout: 60000 });
  return response.data?.data || response.data;
}

export async function getInvoice(invoiceId) {
  const response = await api.get(`/invoices/${invoiceId}`);
  return response.data?.data || response.data?.invoice || response.data;
}

export async function getSellerPayoutMethods() {
  const response = await api.get('/payout-methods');
  return response.data?.data || response.data;
}

export async function addSellerPayoutMethod(payload) {
  const response = await api.post('/payout-methods', payload);
  return response.data?.data || response.data;
}

export async function setDefaultSellerPayoutMethod(methodId) {
  const response = await api.patch(`/payout-methods/${methodId}/default`);
  return response.data?.data || response.data;
}

export async function removeSellerPayoutMethod(methodId) {
  const response = await api.delete(`/payout-methods/${methodId}`);
  return response.data;
}
