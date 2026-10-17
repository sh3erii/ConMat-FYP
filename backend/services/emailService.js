require('dotenv').config();
const nodemailer = require('nodemailer');

const configured = Boolean(
  (process.env.EMAIL_USER || process.env.SMTP_USER) &&
  (process.env.EMAIL_PASS || process.env.SMTP_PASS)
);
const transporter = configured ? nodemailer.createTransport({
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587),
  secure: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587) === 465,
  auth: { user: process.env.EMAIL_USER || process.env.SMTP_USER, pass: process.env.EMAIL_PASS || process.env.SMTP_PASS },
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 10000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 10000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 20000)
}) : null;

async function sendEmail({ to, subject, html, text }) {
  if (!to) return { skipped: true, reason: 'missing-recipient' };
  const mail = { from: process.env.EMAIL_FROM || 'ConMat <noreply@conmat.pk>', to, subject, html, text: text || subject };
  if (!transporter) {
    console.log('[email-preview]', { to, subject });
    return { preview: true };
  }
  return await transporter.sendMail(mail);
}

module.exports = { sendEmail };
