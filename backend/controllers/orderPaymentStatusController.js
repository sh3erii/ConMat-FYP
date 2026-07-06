const orderPaymentStatusService = require('../services/orderPaymentStatusService');

async function createStatusLog(req, res) {
  try {
    const log = await orderPaymentStatusService.createPaymentStatusLog({
      ...req.body,
      changedBy: req.user?.id || req.body.changedBy,
    });

    return res.status(201).json({
      success: true,
      message: 'Order payment status log created successfully.',
      data: log,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function listStatusLogs(req, res) {
  try {
    const logs = await orderPaymentStatusService.listPaymentStatusLogs(req.params.orderNumber);

    return res.status(200).json({
      success: true,
      message: 'Order payment status logs fetched successfully.',
      data: logs,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function confirmOrderPaid(req, res) {
  try {
    const log = await orderPaymentStatusService.markOrderPaid({
      ...req.body,
      changedBy: req.user?.id || req.body.changedBy,
    });

    return res.status(200).json({
      success: true,
      message: 'Order marked as paid successfully.',
      data: log,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function confirmOrderPaymentFailed(req, res) {
  try {
    const log = await orderPaymentStatusService.markOrderPaymentFailed({
      ...req.body,
      changedBy: req.user?.id || req.body.changedBy,
    });

    return res.status(200).json({
      success: true,
      message: 'Order payment failure recorded successfully.',
      data: log,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createStatusLog,
  listStatusLogs,
  confirmOrderPaid,
  confirmOrderPaymentFailed,
};
