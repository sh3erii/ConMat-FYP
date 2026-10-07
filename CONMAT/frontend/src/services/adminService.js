import api from './api';

export const adminService = {
  async getDashboardSummary() {
    const { data } = await api.get('/admin/dashboard-summary');
    return data;
  },

  async getSellerApplications(status = 'Pending') {
    const { data } = await api.get('/admin/seller-applications', { params: { status } });
    return data;
  },

  async approveSeller(userId, note = '') {
    const { data } = await api.put(`/admin/seller-applications/${userId}/approve`, { note });
    return data;
  },

  async rejectSeller(userId, reason = '') {
    const { data } = await api.put(`/admin/seller-applications/${userId}/reject`, { reason });
    return data;
  },

  async getUsers(filters = {}) {
    const { data } = await api.get('/admin/users', { params: filters });
    return data;
  },

  async updateUserStatus(userId, status, reason = '') {
    const { data } = await api.put(`/admin/users/${userId}/status`, { status, reason });
    return data;
  },

  async getPlatformReports() {
    const { data } = await api.get('/admin/reports/platform');
    return data;
  },

  async getBids() {
    const { data } = await api.get('/admin/bids');
    return data;
  },
};
