const adminAnalyticsReportService = require('../services/adminAnalyticsReportService');

async function overview(req, res) {
  try {
    const data = await adminAnalyticsReportService.getOverview(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function revenueTrend(req, res) {
  try {
    const data = await adminAnalyticsReportService.getRevenueTrend(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function orderStatus(req, res) {
  try {
    const data = await adminAnalyticsReportService.getOrderStatusBreakdown(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function roleBreakdown(req, res) {
  try {
    const data = await adminAnalyticsReportService.getRoleBreakdown(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function performance(req, res) {
  try {
    const data = await adminAnalyticsReportService.getPerformanceMetrics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function reportPanels(req, res) {
  try {
    const data = await adminAnalyticsReportService.getReportPanels(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createSnapshot(req, res) {
  try {
    const snapshot = await adminAnalyticsReportService.createSnapshot(req.body);
    return res.status(201).json({ success: true, message: 'Analytics snapshot created.', data: snapshot });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function saveReportChart(req, res) {
  try {
    const chart = await adminAnalyticsReportService.upsertReportChart({
      ...req.body,
      createdBy: req.user?.id || req.user?.userId || null,
    });
    return res.status(200).json({ success: true, message: 'Report chart saved.', data: chart });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  overview,
  revenueTrend,
  orderStatus,
  roleBreakdown,
  performance,
  reportPanels,
  createSnapshot,
  saveReportChart,
};
