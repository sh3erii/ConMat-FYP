import api from './api';

async function request(path, filters = {}) {
  const response = await api.get(path, { params: filters });
  return response.data?.data || response.data;
}

export const getAdminAnalyticsOverview = (filters = {}) => request('/admin/analytics/overview', filters);
export const getAdminRevenueTrend = (filters = {}) => request('/admin/analytics/revenue-trend', filters);
export const getAdminOrderStatusBreakdown = (filters = {}) => request('/admin/analytics/order-status', filters);
export const getAdminRoleBreakdown = (filters = {}) => request('/admin/analytics/role-breakdown', filters);
export const getLowStockPreview = (filters = {}) => request('/inventory/analytics/low-stock-alerts', filters);
export const getPerformanceMetrics = (filters = {}) => request('/admin/analytics/performance', filters);
export const getReportPanels = (filters = {}) => request('/admin/analytics/report-panels', filters);

export async function getCompleteAdminAnalytics(filters = {}) {
  const [overview, revenueTrend, orderStatusBreakdown, roleBreakdown, lowStockAlerts, performanceMetrics, reportPanels] = await Promise.all([
    getAdminAnalyticsOverview(filters),
    getAdminRevenueTrend(filters),
    getAdminOrderStatusBreakdown(filters),
    getAdminRoleBreakdown(filters),
    getLowStockPreview(filters),
    getPerformanceMetrics(filters),
    getReportPanels(filters),
  ]);

  return { overview, revenueTrend, orderStatusBreakdown, roleBreakdown, lowStockAlerts, performanceMetrics, reportPanels };
}
