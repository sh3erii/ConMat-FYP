import api from './api';

function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
}

export async function fetchAdminProducts(params = {}) {
  const { data } = await api.get('/admin/product-management/products', { params });
  return safeList(data);
}

export async function updateAdminProductStatus(productId, payload) {
  const { data } = await api.patch(`/admin/product-management/products/${productId}/status`, payload);
  return data?.product || data?.data || data;
}

export async function fetchAdminOrders(params = {}) {
  const { data } = await api.get('/admin/order-management/orders', { params });
  return safeList(data);
}

export async function updateAdminOrderStatus(orderId, payload) {
  const { data } = await api.patch(`/admin/order-management/orders/${orderId}/status`, payload);
  return data?.order || data?.data || data;
}

export async function fetchAdminActionSummary() {
  const { data } = await api.get('/admin/operations/action-summary');
  return data?.summary || data?.data || data;
}
