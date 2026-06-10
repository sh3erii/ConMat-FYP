const notificationPreferenceService = require('../services/notificationPreferenceService');
const notificationDeliveryService = require('../services/notificationDeliveryService');

async function getMyPreferences(req, res) {
  try {
    const userId = req.user?.id || req.query.userId;
    const preferences = await notificationPreferenceService.getOrCreatePreferences(userId);

    return res.status(200).json({
      success: true,
      message: 'Notification preferences fetched successfully.',
      data: preferences,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateMyPreferences(req, res) {
  try {
    const userId = req.user?.id || req.body.userId;
    const preferences = await notificationPreferenceService.updatePreferences(userId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully.',
      data: preferences,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function sendTestNotification(req, res) {
  try {
    const result = await notificationDeliveryService.deliverNotification({
      userId: req.user?.id || req.body.userId,
      email: req.body.email,
      category: req.body.category || 'ADMIN',
      title: req.body.title || 'ConMat test notification',
      message: req.body.message || 'Your notification settings are working.',
      actionUrl: req.body.actionUrl || '/notifications',
    });

    return res.status(201).json({
      success: true,
      message: 'Test notification processed.',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  getMyPreferences,
  updateMyPreferences,
  sendTestNotification,
};
