require('dotenv').config();
const nodemailer = require('nodemailer');

const hasEmailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = hasEmailCredentials
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  : null;

if (transporter) {
  transporter.verify((err) => {
    if (err) console.error('❌ Email transporter error:', err.message);
    else console.log('✅ Email service ready.');
  });
} else {
  console.warn('⚠️ Email credentials missing. Emails will be logged instead of sent.');
}

const brandWrapper = ({ title, body }) => `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:24px;">
    <div style="max-width:620px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#1c2333;padding:24px;text-align:center;">
        <h1 style="color:#b45309;margin:0;font-size:30px;">ConMat</h1>
        <p style="color:#cbd5e1;margin:6px 0 0;font-size:13px;">Construction Material Marketplace</p>
      </div>
      <div style="padding:30px;">
        <h2 style="color:#111827;margin:0 0 16px;">${title}</h2>
        ${body}
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">ConMat – Pakistan's Construction Marketplace</p>
      </div>
    </div>
  </div>
`;

const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    console.warn('Email skipped: missing recipient. Subject:', subject);
    return { skipped: true, reason: 'missing-recipient' };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'ConMat <noreply@conmat.pk>',
    to,
    subject,
    html,
    text: text || subject
  };

  if (!transporter) {
    console.log('📧 Email preview:', mailOptions);
    return { preview: true, ...mailOptions };
  }

  return transporter.sendMail(mailOptions);
};

const sendOrderConfirmation = async ({ to, buyerName, orderId, totalAmount }) => sendEmail({
  to,
  subject: `ConMat – Order Confirmed #${orderId}`,
  html: brandWrapper({
    title: 'Order Confirmed ✅',
    body: `
      <p style="color:#334155;line-height:1.6;">Hi <strong>${buyerName}</strong>, your order has been placed successfully.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:10px;color:#64748b;">Order ID</td><td style="padding:10px;font-weight:bold;">#${orderId}</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:10px;color:#64748b;">Total Amount</td><td style="padding:10px;font-weight:bold;">Rs. ${totalAmount}</td></tr>
      </table>
      <p style="color:#334155;line-height:1.6;">You can track your order from your ConMat dashboard.</p>
    `
  })
});

const sendOrderStatusUpdate = async ({ to, orderId, status }) => sendEmail({
  to,
  subject: `ConMat – Order ${orderId} is now ${status}`,
  html: brandWrapper({
    title: 'Order Status Updated',
    body: `<p style="color:#334155;line-height:1.6;">Your order <strong>#${orderId}</strong> status is now <strong>${status}</strong>.</p>`
  })
});

const sendVerificationResult = async ({ to, supplierName, status, reason }) => {
  const approved = status === 'Approved' || status === 'Active';
  return sendEmail({
    to,
    subject: `ConMat – Account ${approved ? 'Approved ✅' : 'Rejected ❌'}`,
    html: brandWrapper({
      title: `Account ${approved ? 'Approved' : 'Rejected'}`,
      body: `
        <p style="color:#334155;line-height:1.6;">Hi <strong>${supplierName}</strong>,</p>
        ${approved
          ? '<p style="color:#334155;line-height:1.6;">Your seller account has been approved. You can now log in and start listing products.</p>'
          : `<p style="color:#334155;line-height:1.6;">Your seller account has been rejected. ${reason ? `Reason: <strong>${reason}</strong>` : 'Please contact admin for details.'}</p>`}
      `
    })
  });
};

const sendBidRequestNotification = async ({ to, supplierName, productName, requiredQty }) => sendEmail({
  to,
  subject: 'ConMat – New Bulk Order Request Available',
  html: brandWrapper({
    title: 'New Bulk Order Request 📦',
    body: `
      <p style="color:#334155;line-height:1.6;">Hi <strong>${supplierName}</strong>, a buyer has submitted a bulk request.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:10px;color:#64748b;">Product</td><td style="padding:10px;font-weight:bold;">${productName}</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:10px;color:#64748b;">Required Qty</td><td style="padding:10px;font-weight:bold;">${requiredQty}</td></tr>
      </table>
      <p style="color:#334155;line-height:1.6;">Log in and submit your best bid.</p>
    `
  })
});

const sendBidAcceptedNotification = async ({ to, supplierName, orderId, bidAmount }) => sendEmail({
  to,
  subject: 'ConMat – Your Bid Was Accepted 🎉',
  html: brandWrapper({
    title: 'Bid Accepted 🎉',
    body: `<p style="color:#334155;line-height:1.6;">Hi <strong>${supplierName}</strong>, your bid of <strong>Rs. ${bidAmount}</strong> was accepted. Order: <strong>#${orderId}</strong>.</p>`
  })
});

const sendGenericNotificationEmail = async ({ to, title, message }) => sendEmail({
  to,
  subject: `ConMat – ${title}`,
  html: brandWrapper({
    title,
    body: `<p style="color:#334155;line-height:1.6;">${message}</p>`
  })
});

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendVerificationResult,
  sendBidRequestNotification,
  sendBidAcceptedNotification,
  sendGenericNotificationEmail
};
