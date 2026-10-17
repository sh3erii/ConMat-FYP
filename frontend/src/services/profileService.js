import api from './api';

export async function getMyProfile() {
  const response = await api.get('/profile/me');
  return response.data?.data || response.data?.user || response.data;
}

export async function updateMyProfile(payload) {
  const formData = new FormData();
  const fields = ['name', 'phone', 'street', 'city', 'postalCode', 'companyName', 'materialFocus', 'latitude', 'longitude'];

  fields.forEach((key) => {
    const value = payload?.[key];
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });

  if (payload?.avatarFile instanceof File) formData.append('profilePhoto', payload.avatarFile);

  const response = await api.put('/profile/me', formData);
  return response.data?.data || response.data?.user || response.data;
}

export async function changePassword(payload) {
  const response = await api.put('/profile/change-password', payload);
  return response.data;
}

export async function getRecentActivities({ limit = 5, offset = 0 } = {}) {
  const response = await api.get('/profile/recent-activities', { params: { limit, offset } });
  const payload = response.data || {};
  const activities = payload.data || payload.activities || [];
  return {
    activities: Array.isArray(activities) ? activities : [],
    total: Number(payload.total || 0),
    nextOffset: Number(payload.nextOffset ?? offset),
    hasMore: Boolean(payload.hasMore),
  };
}
