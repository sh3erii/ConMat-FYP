const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const User = require('../models/User');
const { sendEmail } = require('./emailService');
const { runInBackground, runSafely } = require('./asyncService');
const { emitToUser, emitToRole } = require('./socketService');

const prefMap = {
  Order: 'orderUpdates',
  Bid: 'bidUpdates',
  Payment: 'paymentInvoices',
  Invoice: 'paymentInvoices',
  Verification: 'adminAlerts',
  Account: 'adminAlerts',
  Report: 'adminAlerts',
  System: 'adminAlerts',
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const detailEntries = (details) => {
  if (!details) return [];
  if (Array.isArray(details)) {
    return details
      .map((item) => Array.isArray(item) ? item : [item?.label, item?.value])
      .filter(([label, value]) => label && value !== undefined && value !== null && value !== '');
  }
  return Object.entries(details).filter(([, value]) => value !== undefined && value !== null && value !== '');
};

function detailedEmailContent({ title, message, details }) {
  const rows = detailEntries(details);
  const detailHtml = rows.length ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;margin:22px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
      ${rows.map(([label, value]) => `<tr>
        <td class="detail-label" width="38%" style="width:38%;max-width:100%;box-sizing:border-box;padding:11px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:700;line-height:1.5;vertical-align:top;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(label)}</td>
        <td class="detail-value" width="62%" style="width:62%;max-width:100%;box-sizing:border-box;padding:11px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;line-height:1.5;vertical-align:top;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value)}</td>
      </tr>`).join('')}
    </table>` : '';
  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <meta name="x-apple-disable-message-reformatting">
      <style>
        html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        table, td { box-sizing: border-box; }
        img { max-width: 100%; height: auto; }
        @media only screen and (max-width:600px) {
          .email-shell { padding: 12px !important; }
          .email-card { border-radius: 14px !important; }
          .email-content { padding: 22px 16px !important; }
          .email-title { font-size: 21px !important; }
          .detail-label, .detail-value { display: block !important; width: 100% !important; max-width: 100% !important; }
          .detail-label { padding: 12px 12px 4px !important; border-bottom: 0 !important; }
          .detail-value { padding: 0 12px 12px !important; }
        }
      </style>
    </head>
    <body style="width:100%;margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;border-collapse:collapse;background:#f1f5f9">
        <tr>
          <td class="email-shell" align="center" style="width:100%;padding:24px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="width:100%;max-width:640px;table-layout:fixed;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
              <tr>
                <td class="email-content" style="width:100%;max-width:100%;box-sizing:border-box;padding:28px;overflow-wrap:anywhere;word-break:break-word">
                  <div style="max-width:100%;color:#f97316;font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;overflow-wrap:anywhere;word-break:break-word">ConMat</div>
                  <h1 class="email-title" style="max-width:100%;margin:8px 0 12px;font-size:24px;line-height:1.25;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(title)}</h1>
                  <p style="max-width:100%;margin:0;color:#475569;font-size:15px;line-height:1.7;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(message)}</p>
                  ${detailHtml}
                  <p style="max-width:100%;margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;overflow-wrap:anywhere;word-break:break-word">This automated message was sent by ConMat. Do not share passwords or payment credentials by email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const text = [title, message, textRows].filter(Boolean).join('\n\n');
  return { html, text };
}

async function sendDetailedEmail({ email, title, message, details = null }) {
  if (!email) return { skipped: true, reason: 'missing-recipient' };
  const content = detailedEmailContent({ title, message, details });
  return await sendEmail({ to: email, subject: `ConMat - ${title}`, ...content });
}

async function getPrefs(userId) {
  const [prefs] = await NotificationPreference.findOrCreate({ where: { userId }, defaults: { userId } });
  return prefs;
}

async function notify({ userId, email, title, message, type = 'System', actionUrl = null, metadata = null, emailDetails = null }) {
  if (!userId) return null;
  const prefs = await getPrefs(userId);
  const key = prefMap[type];
  if (key && prefs[key] === false) return null;
  const record = await Notification.create({ userId, title, message, type, actionUrl, metadata });
  emitToUser(userId, 'notifications:changed', { notificationId: record.id, type });
  if (['Order', 'Payment', 'Invoice'].includes(type)) {
    emitToUser(userId, 'orders:changed', { type, orderId: metadata?.orderId || null });
    emitToRole('Admin', 'orders:changed', { type, orderId: metadata?.orderId || null });
  }
  if (['Verification', 'Account'].includes(type)) {
    emitToUser(userId, 'account:changed', { type, status: metadata?.status || null });
  }
  if (email && prefs.emailEnabled) {
    runInBackground(`Email delivery failed for ${email}`, async () => {
      await sendDetailedEmail({ email, title, message, details: emailDetails });
    });
  }
  return record;
}

async function notifySafely(payload, label = 'Notification skipped') {
  return await runSafely(label, async () => await notify(payload));
}

async function notifyActiveAdminsSafely(payload, label = 'Admin notifications skipped') {
  return await runSafely(label, async () => {
    const admins = await User.findAll({
      where: { role: 'Admin', status: 'Active' },
      attributes: ['id', 'email'],
    });
    return await Promise.all(admins.map(async (admin) => await notifySafely({
      ...payload,
      userId: admin.id,
      email: admin.email,
    }, `Admin notification skipped for ${admin.id}`)));
  });
}

module.exports = {
  notify,
  notifySafely,
  notifyActiveAdminsSafely,
  getPrefs,
  sendDetailedEmail,
  detailedEmailContent,
};
