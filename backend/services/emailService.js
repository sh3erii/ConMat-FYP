require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,  // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS 
  }
  });

transporter.verify((err) => {
  if (err) {
    console.error('❌ Email transporter error:', err.message);
  } else {
    console.log('✅ Email service ready.');
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from:    process.env.EMAIL_FROM || 'ConMat <noreply@conmat.pk>',
    to,
    subject,
    html,
    text: text || subject   // plain text fallback
  };
  return await transporter.sendMail(mailOptions);
};

const sendOrderConfirmation = async ({ to, buyerName, orderId, totalAmount }) => {
  return sendEmail({
    to,
    subject: `ConMat – Order Confirmed #${orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <div style="background:#1e293b;padding:24px;text-align:center;">
          <h1 style="color:#f97316;margin:0;">ConMat</h1>
          <p style="color:#94a3b8;margin:4px 0;">Construction Material Marketplace</p>
        </div>
        <div style="padding:32px;background:#fff;">
          <h2 style="color:#1e293b;">Order Confirmed ✅</h2>
          <p>Hi <strong>${buyerName}</strong>,</p>
          <p>Your order has been placed successfully.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#64748b;">Order ID</td><td style="padding:8px;font-weight:bold;">#${orderId}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:8px;color:#64748b;">Total Amount</td><td style="padding:8px;font-weight:bold;">Rs. ${totalAmount}</td></tr>
          </table>
          <p>You can track your order from your dashboard.</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">ConMat – Pakistan's Construction Marketplace</p>
        </div>
      </div>
    `
  });
};

const sendVerificationResult = async ({ to, supplierName, status }) => {
  const approved = status === 'Approved';
  return sendEmail({
    to,
    subject: `ConMat – Account ${approved ? 'Approved ✅' : 'Rejected ❌'}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <div style="background:#1e293b;padding:24px;text-align:center;">
          <h1 style="color:#f97316;margin:0;">ConMat</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <h2 style="color:#1e293b;">Account ${approved ? 'Approved' : 'Rejected'}</h2>
          <p>Hi <strong>${supplierName}</strong>,</p>
          ${approved
            ? '<p>Your supplier account has been <strong style="color:#16a34a;">approved</strong>. You can now log in and start listing your products.</p>'
            : '<p>Unfortunately your supplier account has been <strong style="color:#dc2626;">rejected</strong>. Please contact support for more information.</p>'
          }
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">ConMat – Pakistan's Construction Marketplace</p>
        </div>
      </div>
    `
  });
};

const sendBidRequestNotification = async ({ to, supplierName, productName, requiredQty }) => {
  return sendEmail({
    to,
    subject: 'ConMat – New Bulk Order Request Available',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <div style="background:#1e293b;padding:24px;text-align:center;">
          <h1 style="color:#f97316;margin:0;">ConMat</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <h2 style="color:#1e293b;">New Bulk Order Request 📦</h2>
          <p>Hi <strong>${supplierName}</strong>,</p>
          <p>A buyer has submitted a bulk order request for:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#64748b;">Product</td><td style="padding:8px;font-weight:bold;">${productName}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:8px;color:#64748b;">Required Qty</td><td style="padding:8px;font-weight:bold;">${requiredQty} units</td></tr>
          </table>
          <p>Log in to your dashboard and submit your best bid!</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">ConMat – Pakistan's Construction Marketplace</p>
        </div>
      </div>
    `
  });
};

const sendBidAcceptedNotification = async ({ to, supplierName, orderId, bidAmount }) => {
  return sendEmail({
    to,
    subject: 'ConMat – Your Bid Was Accepted 🎉',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <div style="background:#1e293b;padding:24px;text-align:center;">
          <h1 style="color:#f97316;margin:0;">ConMat</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <h2 style="color:#16a34a;">Bid Accepted 🎉</h2>
          <p>Hi <strong>${supplierName}</strong>,</p>
          <p>Your bid of <strong>Rs. ${bidAmount}</strong> has been accepted!</p>
          <p>An order has been created: <strong>#${orderId}</strong></p>
          <p>Please prepare your stock and await payment confirmation.</p>
        </div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">ConMat – Pakistan's Construction Marketplace</p>
        </div>
      </div>
    `
  });
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendVerificationResult,
  sendBidRequestNotification,
  sendBidAcceptedNotification
};

sendEmail({
  to: 'nosherwaannn@gmail.com',
  subject: 'ConMat email test',
  html: '<h1>Email works!</h1>'
}).then(() => console.log('Email sent!')).catch(console.error);