const ReportSchedule = require('../models/ReportSchedule');
const { buildReportEmailPayload } = require('./scheduledReportEmailService');

function getNextRunAt(frequency) {
  const date = new Date();
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  return date;
}

async function createSchedule(payload, user) {
  return ReportSchedule.create({
    title: payload.title,
    reportType: payload.reportType,
    frequency: payload.frequency || 'weekly',
    recipients: payload.recipients || [],
    filters: payload.filters || {},
    isActive: payload.isActive !== false,
    nextRunAt: getNextRunAt(payload.frequency || 'weekly'),
    createdBy: user?.id || user?.userId || null,
  });
}

async function listSchedules() {
  return ReportSchedule.findAll({ order: [['createdAt', 'DESC']] });
}

async function toggleSchedule(id, isActive) {
  const schedule = await ReportSchedule.findByPk(id);
  if (!schedule) throw new Error('Report schedule not found');
  schedule.isActive = typeof isActive === 'boolean' ? isActive : !schedule.isActive;
  schedule.nextRunAt = schedule.isActive ? getNextRunAt(schedule.frequency) : null;
  await schedule.save();
  return schedule;
}

async function deleteSchedule(id) {
  const schedule = await ReportSchedule.findByPk(id);
  if (!schedule) throw new Error('Report schedule not found');
  await schedule.destroy();
  return { deleted: true };
}

async function buildReportData(schedule) {
  // Day 12 placeholder report data. Day 13 can connect this with admin analytics services.
  return {
    reportType: schedule.reportType,
    filters: schedule.filters || {},
    records: [
      { label: 'Total Orders', value: 318 },
      { label: 'Paid Revenue', value: 7845000 },
      { label: 'Pending Sellers', value: 7 },
      { label: 'Low Stock Products', value: 5 },
    ],
  };
}

async function runScheduleNow(id) {
  const schedule = await ReportSchedule.findByPk(id);
  if (!schedule) throw new Error('Report schedule not found');

  const reportData = await buildReportData(schedule);
  const emailPayload = buildReportEmailPayload(schedule.toJSON ? schedule.toJSON() : schedule, reportData);

  schedule.lastRunAt = new Date();
  schedule.nextRunAt = getNextRunAt(schedule.frequency);
  await schedule.save();

  return {
    schedule,
    reportData,
    emailPayload,
    deliveryStatus: 'prepared',
  };
}

module.exports = {
  createSchedule,
  listSchedules,
  toggleSchedule,
  deleteSchedule,
  runScheduleNow,
};
