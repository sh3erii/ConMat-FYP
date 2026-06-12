const roleAccessAuditService = require('../services/roleAccessAuditService');
const smokeReportService = require('../services/smokeReportService');

const roleMatrix = (req, res) => {
  res.status(200).json(roleAccessAuditService.getRoleMatrix());
};

const protectedRoutes = (req, res) => {
  res.status(200).json(roleAccessAuditService.getProtectedRoutes());
};

const rebuildRoleAudit = async (req, res, next) => {
  try {
    const result = await roleAccessAuditService.rebuildRoleAudit();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const smokeSummary = async (req, res, next) => {
  try {
    const result = await smokeReportService.buildSmokeSummary();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { roleMatrix, protectedRoutes, rebuildRoleAudit, smokeSummary };
