// ============================================================
//  routes/notificationRoutes.js  (Muhammad Nosherwan – 076926)
//  Day 3 – Notification routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  createNotification,
  getMyNotifications,
  getAllNotifications,
  markNotificationRead,
  markAllMyNotificationsRead,
  deleteNotification
} = require('../controllers/notificationController');

router.use(protect);

router.get('/mine', getMyNotifications);
router.patch('/mine/read-all', markAllMyNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

router.post('/', authorize('Admin'), createNotification);
router.get('/', authorize('Admin'), getAllNotifications);

module.exports = router;
