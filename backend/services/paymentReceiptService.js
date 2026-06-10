const nodemailer = require('nodemailer');

function createReceiptNumber() {
  return `RCPT-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
}

function buildReceiptHtml({ buyerName, orderNumber, amount, paymentReference }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="color:#b45309">ConMat Payment Receipt</h2>
      <p>Dear ${buyerName || 'Customer'}, your payment has been confirmed.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:520px">
        <tr><td><strong>Order Number</strong></td><td>${orderNumber || '-'}</td></tr>
        <tr><td><strong>Amount</strong></td><td>PKR ${Number(amount || 0).toLocaleString('en-PK')}</td></tr>
        <tr><td><strong>Reference</strong></td><td>${paymentReference || '-'}</td></tr>
      </table>
      <p>You can download your digital invoice from your ConMat dashboard.</p>
    </div>
  `;
}

async function sendPaymentReceiptEmail({ to, buyerName, orderNumber, amount, paymentReference }) {
  const receiptNumber = createReceiptNumber();

  if (!to || !process.env.SMTP_HOST) {
    return {
      sent: false,
      receiptNumber,
      message: 'SMTP is not configured or buyer email is missing. Receipt email skipped.',
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'ConMat <no-reply@conmat.pk>',
    to,
    subject: `ConMat Payment Receipt - ${orderNumber}`,
    html: buildReceiptHtml({ buyerName, orderNumber, amount, paymentReference }),
  });

  return { sent: true, receiptNumber };
}

module.exports = {
  createReceiptNumber,
  buildReceiptHtml,
  sendPaymentReceiptEmail,
};
