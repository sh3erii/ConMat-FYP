// ============================================================
//  services/adminAuditService.js  (Muhammad Nosherwan – 076926)
//  Day 7 – admin audit helper
// ============================================================
const Notification = require('../models/Notification');

const createAdminAudit = async ({ adminId, action, targetUserId, message, metadata = {} }) => {
  try {
    await Notification.create({
      userId: targetUserId || adminId,
      title: action,
      message,
      type: 'System',
      metadata,
      isRead: false
    });
  } catch (error) {
    console.error('Admin audit notification skipped:', error.message);
  }
};

module.exports = { createAdminAudit };
