const AdminOperationLog = require('../models/AdminOperationLog');

async function logAdminOperation(payload = {}) {
  return AdminOperationLog.create({
    adminId: payload.adminId || null,
    moduleName: payload.moduleName || 'Admin',
    action: payload.action,
    entityType: payload.entityType || null,
    entityId: payload.entityId || null,
    summary: payload.summary || null,
    metadata: payload.metadata || null,
  });
}

async function getAuditFeed(query = {}) {
  const limit = Number(query.limit || 50);
  return AdminOperationLog.findAll({
    limit,
    order: [['createdAt', 'DESC']],
  });
}

async function getActionSummary() {
  const logs = await AdminOperationLog.findAll({
    limit: 200,
    order: [['createdAt', 'DESC']],
  });

  const summary = logs.reduce((acc, log) => {
    const moduleName = log.moduleName || 'Admin';
    acc.totalActions += 1;
    acc.byModule[moduleName] = (acc.byModule[moduleName] || 0) + 1;
    return acc;
  }, { totalActions: 0, byModule: {} });

  return summary;
}

module.exports = {
  logAdminOperation,
  getAuditFeed,
  getActionSummary,
};
