const reportSchedulerService = require('../services/reportSchedulerService');

function ok(res, message, data, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, error) {
  return res.status(500).json({ success: false, message: error.message || 'Report schedule request failed' });
}

async function createSchedule(req, res) {
  try {
    const data = await reportSchedulerService.createSchedule(req.body, req.user);
    return ok(res, 'Report schedule created successfully', data, 201);
  } catch (error) {
    return fail(res, error);
  }
}

async function listSchedules(req, res) {
  try {
    const data = await reportSchedulerService.listSchedules();
    return ok(res, 'Report schedules fetched successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

async function toggleSchedule(req, res) {
  try {
    const data = await reportSchedulerService.toggleSchedule(req.params.id, req.body.isActive);
    return ok(res, 'Report schedule status updated successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

async function runScheduleNow(req, res) {
  try {
    const data = await reportSchedulerService.runScheduleNow(req.params.id);
    return ok(res, 'Report schedule run prepared successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

async function deleteSchedule(req, res) {
  try {
    const data = await reportSchedulerService.deleteSchedule(req.params.id);
    return ok(res, 'Report schedule deleted successfully', data);
  } catch (error) {
    return fail(res, error);
  }
}

module.exports = {
  createSchedule,
  listSchedules,
  toggleSchedule,
  runScheduleNow,
  deleteSchedule,
};
