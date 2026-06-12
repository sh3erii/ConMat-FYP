const getExportReadiness = () => ({
  reports: [
    { id: 1, name: 'Platform Summary CSV', endpoint: '/api/admin/operations/export/platform', status: 'ready' },
    { id: 2, name: 'Product CSV', endpoint: '/api/admin/operations/export/products', status: 'ready' },
    { id: 3, name: 'Order CSV', endpoint: '/api/admin/operations/export/orders', status: 'ready' },
    { id: 4, name: 'Bidding Report', endpoint: '/api/admin/analytics/bidding', status: 'ready' },
    { id: 5, name: 'Supplier Analytics', endpoint: '/api/supplier/analytics', status: 'ready' },
  ],
  notes: [
    'CSV export should use safe filenames.',
    'Date filters should be optional.',
    'Admin-only route middleware must be applied before final demo.',
  ],
});

module.exports = { getExportReadiness };
