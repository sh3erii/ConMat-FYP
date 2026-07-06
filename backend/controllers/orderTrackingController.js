const orderTrackingService = require('../services/orderTrackingService');

async function listOrderTracking(req, res) {
  try {
    const { orderIdOrNumber } = req.params;
    const events = await orderTrackingService.getOrderTracking(orderIdOrNumber, req.user?.role === 'Admin');

    return res.status(200).json({
      success: true,
      message: 'Order tracking timeline fetched successfully.',
      data: events,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createOrderTracking(req, res) {
  try {
    const event = await orderTrackingService.createTrackingEvent({
      ...req.body,
      updatedBy: req.user?.id || req.body.updatedBy,
    });

    return res.status(201).json({
      success: true,
      message: 'Order tracking event created successfully.',
      data: event,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function addStatusUpdate(req, res) {
  try {
    const { orderId } = req.params;
    const event = await orderTrackingService.createTrackingEvent({
      orderId,
      orderNumber: req.body.orderNumber,
      status: req.body.status,
      description: req.body.description,
      location: req.body.location,
      updatedBy: req.user?.id || req.body.updatedBy,
      visibleToBuyer: req.body.visibleToBuyer !== false,
    });

    return res.status(201).json({
      success: true,
      message: 'Order status timeline updated successfully.',
      data: event,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  listOrderTracking,
  createOrderTracking,
  addStatusUpdate,
};
