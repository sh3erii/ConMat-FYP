import api from './api';

export async function getMyTransactionReport(filters = {}) {
  const { data } = await api.get('/reports/me', { params: filters });
  return data?.data || data?.report || data;
}

export async function getPlatformTransactionReport(filters = {}) {
  const { data } = await api.get('/reports/platform', { params: filters });
  return data?.data || data?.report || data;
}
