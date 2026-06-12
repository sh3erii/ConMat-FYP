const notificationAutomationService = require('../services/notificationAutomationService');

function ok(res, message, data, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, error) {
  return res.status(500).json({ success: false, message: error.message || 'Notification automation request failed' });
}

async function createRule(req, res) {
  try {
    const data = await notificationAutomationService.createRule(req.body);
    return ok(res, 'Notification automation rule created successfully', data, 201);
  } catch (error) {
    return fail(res, error);
  }
}

async function listRules(req, res) {
  try {
    const data = await notificationAutomationService.listRules();
    return ok(res, 'Notification automation rules fetched successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

async function updateRule(req, res) {
  try {
    const data = await notificationAutomationService.updateRule(req.params.id, req.body);
    return ok(res, 'Notification automation rule updated successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

async function testRule(req, res) {
  try {
    const data = await notificationAutomationService.testRule(req.params.id, req.body.context || {});
    return ok(res, 'Notification automation rule preview generated successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

async function deleteRule(req, res) {
  try {
    const data = await notificationAutomationService.deleteRule(req.params.id);
    return ok(res, 'Notification automation rule deleted successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

module.exports = {
  createRule,
  listRules,
  updateRule,
  testRule,
  deleteRule,
};
