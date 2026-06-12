const nodemailer = require('nodemailer');
const adminOperationAuditService = require('./adminOperationAuditService');

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function notifyUserFromAdmin(payload = {}) {
  if (!payload.to) throw new Error('Recipient email is required.');
  if (!payload.subject) throw new Error('Subject is required.');
  if (!payload.message) throw new Error('Message is required.');

  const transporter = createTransporter();

  const mailPayload = {
    from: process.env.SMTP_FROM || 'ConMat <no-reply@conmat.local>',
    to: payload.to,
    subject: payload.subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a">
        <h2 style="color:#b45309">ConMat Admin Notification</h2>
        <p>${payload.message}</p>
        <p style="color:#64748b;font-size:13px">This notification was generated from the ConMat admin panel.</p>
      </div>
    `,
  };

  if (transporter) {
    await transporter.sendMail(mailPayload);
  }

  await adminOperationAuditService.logAdminOperation({
    adminId: payload.adminId || null,
    moduleName: 'Notification',
    action: 'ADMIN_NOTIFY_USER',
    entityType: payload.entityType || 'User',
    entityId: payload.entityId || payload.to,
    summary: `Admin notification prepared for ${payload.to}`,
    metadata: {
      subject: payload.subject,
      emailSent: Boolean(transporter),
    },
  });

  return {
    emailSent: Boolean(transporter),
    message: transporter ? 'Notification email sent.' : 'SMTP not configured. Notification logged only.',
  };
}

module.exports = {
  notifyUserFromAdmin,
};
