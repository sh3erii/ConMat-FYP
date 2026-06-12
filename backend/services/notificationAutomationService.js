const NotificationAutomationRule = require('../models/NotificationAutomationRule');

async function createRule(payload) {
  return NotificationAutomationRule.create({
    name: payload.name,
    triggerEvent: payload.triggerEvent,
    audienceRole: payload.audienceRole || 'All',
    channels: payload.channels || ['email'],
    subjectTemplate: payload.subjectTemplate,
    bodyTemplate: payload.bodyTemplate,
    conditions: payload.conditions || {},
    isActive: payload.isActive !== false,
  });
}

async function listRules() {
  return NotificationAutomationRule.findAll({ order: [['createdAt', 'DESC']] });
}

async function updateRule(id, payload) {
  const rule = await NotificationAutomationRule.findByPk(id);
  if (!rule) throw new Error('Notification automation rule not found');
  await rule.update(payload);
  return rule;
}

async function deleteRule(id) {
  const rule = await NotificationAutomationRule.findByPk(id);
  if (!rule) throw new Error('Notification automation rule not found');
  await rule.destroy();
  return { deleted: true };
}

function renderTemplate(template, context = {}) {
  return String(template || '').replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    return key.split('.').reduce((value, part) => value?.[part], context) ?? '';
  });
}

async function testRule(id, context = {}) {
  const rule = await NotificationAutomationRule.findByPk(id);
  if (!rule) throw new Error('Notification automation rule not found');

  const payload = {
    channels: rule.channels,
    audienceRole: rule.audienceRole,
    triggerEvent: rule.triggerEvent,
    subject: renderTemplate(rule.subjectTemplate, context),
    body: renderTemplate(rule.bodyTemplate, context),
    previewOnly: true,
  };

  rule.lastTriggeredAt = new Date();
  await rule.save();

  return payload;
}

module.exports = {
  createRule,
  listRules,
  updateRule,
  deleteRule,
  testRule,
};
