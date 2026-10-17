const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const { emitToUser } = require('../services/socketService');

const notificationTypes = new Set(['System', 'Order', 'Payment', 'Invoice', 'Bid', 'Verification', 'Account', 'Report']);
const preferenceKeys = ['orderUpdates', 'bidUpdates', 'paymentInvoices', 'adminAlerts', 'emailEnabled'];

const publicPreferences = (preference) => Object.fromEntries(
  preferenceKeys.map((key) => [key, Boolean(preference[key])]),
);

exports.mine = async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, Math.floor(Number(req.query.limit) || 5)));
    const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0));
    const filter = String(req.query.filter || 'All').trim();
    const where = { userId: req.user.id };

    if (filter === 'Unread') where.isRead = false;
    else if (notificationTypes.has(filter)) where.type = filter;

    const [{ rows, count }, unread] = await Promise.all([
      Notification.findAndCountAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset }),
      Notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    const data = rows.map((notification) => notification.toJSON());
    const nextOffset = offset + data.length;

    res.json({ success: true, data, notifications: data, unread, total: count, limit, offset, nextOffset, hasMore: nextOffset < count });
  } catch (e) { next(e); }
};

exports.one = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, data: notification });
  } catch (e) { next(e); }
};

exports.read = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    if (!notification.isRead) await notification.update({ isRead: true, readAt: new Date() });
    emitToUser(req.user.id, 'notifications:changed', { notificationId: notification.id });
    res.json({ success: true, notification });
  } catch (e) { next(e); }
};

exports.readAll = async (req, res, next) => {
  try {
    const [updated] = await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId: req.user.id, isRead: false } },
    );
    emitToUser(req.user.id, 'notifications:changed', { allRead: true });
    res.json({ success: true, updated });
  } catch (e) { next(e); }
};
exports.getPrefs = async (req,res,next)=>{ try { const [p] = await NotificationPreference.findOrCreate({where:{userId:req.user.id},defaults:{userId:req.user.id}}); res.json({success:true,data:publicPreferences(p)}); }catch(e){next(e);} };
exports.updatePrefs = async (req,res,next)=>{ try { const [p] = await NotificationPreference.findOrCreate({where:{userId:req.user.id},defaults:{userId:req.user.id}}); for(const k of preferenceKeys) if(typeof req.body[k]==='boolean') p[k]=req.body[k]; await p.save(); res.json({success:true,data:publicPreferences(p)}); }catch(e){next(e);} };
