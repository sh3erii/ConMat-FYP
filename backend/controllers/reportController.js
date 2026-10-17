const {
  allowedReportTypesForRole,
  generatePlatformReport,
  generateUserReport,
} = require('../services/reportService');

exports.options = async (req, res) => {
  res.json({
    success: true,
    data: {
      role: req.user.role,
      reportTypes: allowedReportTypesForRole(req.user.role),
    },
  });
};

exports.mine = async (req, res, next) => {
  try {
    const report = req.user.role === 'Admin'
      ? await generatePlatformReport({ user: req.user, query: req.query })
      : await generateUserReport({ user: req.user, query: req.query });
    res.json({ success: true, data: report, report });
  } catch (error) {
    next(error);
  }
};

exports.platform = async (req, res, next) => {
  try {
    const report = await generatePlatformReport({ user: req.user, query: req.query });
    res.json({ success: true, data: report, report });
  } catch (error) {
    next(error);
  }
};
