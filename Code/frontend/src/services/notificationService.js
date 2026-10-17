import api from './api';

export async function getMyNotifications({ limit = 5, offset = 0, filter = 'All' } = {}) {
  const response = await api.get('/notifications', { params: { limit, offset, filter } });
  const payload = response.data || {};
  const notifications = payload.data || payload.notifications || [];
  return {
    notifications: Array.isArray(notifications) ? notifications : [],
    unread: Number(payload.unread || 0),
    total: Number(payload.total || 0),
    nextOffset: Number(payload.nextOffset ?? offset),
    hasMore: Boolean(payload.hasMore),
  };
}

export async function getUnreadNotificationCount() {
  const page = await getMyNotifications({ limit: 1, offset: 0 });
  return page.unread;
}

export async function getNotificationById(notificationId) {
  const response = await api.get(`/notifications/${notificationId}`);
  return response.data?.data || response.data?.notification || response.data;
}

export async function markNotificationRead(notificationId) {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('conmat:notifications-changed'));
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('conmat:notifications-changed'));
  return response.data;
}

export async function getNotificationPreferences() {
  const response = await api.get('/notification-preferences/me');
  return response.data?.data || response.data;
}

export async function updateNotificationPreferences(payload) {
  const response = await api.put('/notification-preferences/me', payload);
  return response.data?.data || response.data;
}

export async function getOrderTracking(orderId) {
  const response = await api.get(`/order-tracking/${orderId}`);
  const data = response.data?.data || response.data;
  if (Array.isArray(data)) return { order: response.data?.order || null, events: data, items: [] };
  return {
    order: data?.order || response.data?.order || null,
    events: Array.isArray(data?.events) ? data.events : [],
    items: Array.isArray(data?.items) ? data.items : [],
  };
}
