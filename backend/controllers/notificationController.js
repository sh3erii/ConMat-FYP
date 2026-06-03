// ============================================================
//  controllers/notificationController.js  (Muhammad Nosherwan – 076926)
//  Day 3 – Notification APIs
// ============================================================
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendGenericNotificationEmail } = require('../services/emailService');

const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type = 'System', metadata, sendEmail = false } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ success: false, message: 'userId, title and message are required.' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Target user not found.' });

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      metadata: metadata || null
    });

    if (sendEmail) {
      sendGenericNotificationEmail({
        to: user.email,
        title,
        message
      }).catch((error) => console.warn('Notification email skipped:', error.message));
    }

    return res.status(201).json({ success: true, message: 'Notification created successfully.', notification });
  } catch (error) {
    console.error('Create Notification Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating notification.' });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unread: notifications.filter((item) => !item.isRead).length,
      notifications
    });
  } catch (error) {
    console.error('Get Notifications Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching notifications.' });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    console.error('Get All Notifications Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching all notifications.' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });

    if (notification.userId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied for this notification.' });
    }

    await notification.update({ isRead: true, readAt: new Date() });
    return res.status(200).json({ success: true, message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('Mark Notification Read Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while marking notification as read.' });
  }
};

const markAllMyNotificationsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId: req.user.id, isRead: false } }
    );

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark All Notifications Read Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while marking notifications as read.' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });

    if (notification.userId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied for this notification.' });
    }

    await notification.destroy();
    return res.status(200).json({ success: true, message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Delete Notification Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while deleting notification.' });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  getAllNotifications,
  markNotificationRead,
  markAllMyNotificationsRead,
  deleteNotification
};
