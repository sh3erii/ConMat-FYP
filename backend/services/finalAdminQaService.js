const FinalQaIssue = require('../models/FinalQaIssue');
const { getNotificationAudit, getNotificationWarnings } = require('./finalNotificationAuditService');
const { getExportReadiness } = require('./finalReportExportCleanupService');

const getFinalChecklist = () => ({
  success: true,
  day: 14,
  checklist: [
    { id: 1, module: 'Payments', owner: 'Nosherwan', check: 'Stripe demo payment and invoice generation tested', status: 'pending' },
    { id: 2, module: 'Bidding', owner: 'Nosherwan', check: 'Accepted bid converts to order', status: 'pending' },
    { id: 3, module: 'Admin Reports', owner: 'Nosherwan', check: 'Analytics and CSV export tested', status: 'pending' },
    { id: 4, module: 'Notifications', owner: 'Nosherwan', check: 'Email/in-app notifications fallback tested', status: 'pending' },
    { id: 5, module: 'Role Access', owner: 'Team', check: 'Admin routes protected', status: 'pending' },
  ],
  notificationAudit: getNotificationAudit(),
  exportReadiness: getExportReadiness(),
  warnings: getNotificationWarnings(),
});

const listIssues = async () => {
  try {
    const issues = await FinalQaIssue.findAll({ order: [['createdAt', 'DESC']], limit: 50 });
    return { success: true, issues };
  } catch (error) {
    return {
      success: true,
      source: 'fallback',
      issues: [
        { id: 'demo-1', moduleName: 'Frontend', title: 'Check mobile navbar spacing', priority: 'Medium', status: 'Open' },
        { id: 'demo-2', moduleName: 'Notifications', title: 'Verify SMTP fallback message', priority: 'High', status: 'Open' },
      ],
    };
  }
};

const createIssue = async (payload) => {
  const cleanPayload = {
    moduleName: payload.moduleName || 'General',
    title: payload.title,
    description: payload.description || '',
    priority: payload.priority || 'Medium',
    assignedTo: payload.assignedTo || null,
  };

  try {
    const issue = await FinalQaIssue.create(cleanPayload);
    return { success: true, message: 'Final QA issue created', issue };
  } catch (error) {
    return { success: true, source: 'fallback', message: 'Issue accepted in fallback mode', issue: { id: `fallback-${Date.now()}`, ...cleanPayload, status: 'Open' } };
  }
};

module.exports = { getFinalChecklist, listIssues, createIssue };
