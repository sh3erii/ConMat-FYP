const RoleAccessAudit = require('../models/RoleAccessAudit');

const roleMatrix = [
  { role: 'admin', moduleName: 'Admin Dashboard', routePath: '/admin/dashboard', accessLevel: 'allowed' },
  { role: 'admin', moduleName: 'Seller Verification', routePath: '/admin/seller-verification', accessLevel: 'allowed' },
  { role: 'admin', moduleName: 'Integration Check', routePath: '/admin/integration-check', accessLevel: 'allowed' },
  { role: 'supplier', moduleName: 'Supplier Dashboard', routePath: '/supplier/dashboard', accessLevel: 'allowed' },
  { role: 'supplier', moduleName: 'Supplier Analytics', routePath: '/supplier/analytics', accessLevel: 'allowed' },
  { role: 'customer', moduleName: 'Customer Dashboard', routePath: '/customer/dashboard', accessLevel: 'allowed' },
  { role: 'wholesaler', moduleName: 'Bulk Orders', routePath: '/wholesaler/bulk-order', accessLevel: 'allowed' },
  { role: 'retailer', moduleName: 'Bulk Orders', routePath: '/retailer/bulk-order', accessLevel: 'allowed' },
];

const getRoleMatrix = () => ({
  success: true,
  roles: roleMatrix,
});

const getProtectedRoutes = () => ({
  success: true,
  protectedRoutes: roleMatrix.map((item) => ({
    path: item.routePath,
    allowedRole: item.role,
    moduleName: item.moduleName,
  })),
});

const rebuildRoleAudit = async () => {
  const saved = [];
  for (const item of roleMatrix) {
    try {
      const record = await RoleAccessAudit.create({ ...item, notes: 'Day 13 protected route audit record' });
      saved.push(record);
    } catch (error) {
      // Continue before DB sync/migration is completed.
    }
  }

  return {
    success: true,
    message: 'Role access audit prepared',
    total: roleMatrix.length,
    saved: saved.length,
    roles: roleMatrix,
  };
};

module.exports = { getRoleMatrix, getProtectedRoutes, rebuildRoleAudit };
