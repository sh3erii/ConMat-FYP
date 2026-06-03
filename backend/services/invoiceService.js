// ============================================================
//  services/invoiceService.js  (Muhammad Nosherwan – 076926)
//  Day 2 – PDF invoice generator using PDFKit
//  Run once in backend: npm install pdfkit
// ============================================================
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');

const invoicesDir = path.join(__dirname, '..', 'uploads', 'invoices');
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

const createInvoiceNumber = () => {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CM-${stamp}-${random}`;
};

const generateInvoicePdf = ({ invoiceNumber, orderId, paymentId, buyerId, amount, currency = 'pkr' }) => {
  const fileName = `${invoiceNumber}.pdf`;
  const absolutePath = path.join(invoicesDir, fileName);
  const publicUrl = `/uploads/invoices/${fileName}`;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(fs.createWriteStream(absolutePath));

  doc
    .fontSize(26)
    .fillColor('#1C2333')
    .text('ConMat', { align: 'left' })
    .fontSize(10)
    .fillColor('#B45309')
    .text('Construction Material Wholesale & Retail Marketplace', { align: 'left' });

  doc.moveDown(1.4);
  doc
    .fontSize(20)
    .fillColor('#111827')
    .text('Payment Invoice', { align: 'right' })
    .fontSize(11)
    .fillColor('#64748B')
    .text(`Invoice No: ${invoiceNumber}`, { align: 'right' })
    .text(`Issued: ${new Date().toLocaleString()}`, { align: 'right' });

  doc.moveDown(2);
  doc
    .fontSize(12)
    .fillColor('#111827')
    .text('Invoice Details', { underline: true })
    .moveDown(0.7)
    .fontSize(10)
    .fillColor('#334155')
    .text(`Order ID: ${orderId}`)
    .text(`Payment ID: ${paymentId}`)
    .text(`Buyer ID: ${buyerId}`)
    .text(`Currency: ${currency.toUpperCase()}`);

  doc.moveDown(1.5);
  doc
    .fontSize(12)
    .fillColor('#111827')
    .text('Summary', { underline: true });

  const tableTop = doc.y + 14;
  doc
    .roundedRect(50, tableTop, 495, 34, 8)
    .fill('#1C2333')
    .fillColor('#FFFFFF')
    .fontSize(10)
    .text('Description', 65, tableTop + 11)
    .text('Amount', 450, tableTop + 11);

  doc
    .roundedRect(50, tableTop + 38, 495, 44, 8)
    .fill('#F8FAFC')
    .fillColor('#111827')
    .text('Construction Material Order Payment', 65, tableTop + 55)
    .text(formatPKR(amount), 430, tableTop + 55);

  doc
    .fontSize(14)
    .fillColor('#B45309')
    .text(`Total: ${formatPKR(amount)}`, 350, tableTop + 104, { align: 'right' });

  doc.moveDown(6);
  doc
    .fontSize(9)
    .fillColor('#64748B')
    .text('This invoice is generated automatically by ConMat after successful payment confirmation.', {
      align: 'center'
    });

  doc.end();
  return { absolutePath, publicUrl };
};

const createInvoiceForPayment = async ({ orderId, paymentId, buyerId, amount, currency = 'pkr' }) => {
  const invoiceNumber = createInvoiceNumber();
  const { publicUrl } = generateInvoicePdf({ invoiceNumber, orderId, paymentId, buyerId, amount, currency });

  const invoice = await Invoice.create({
    invoiceNumber,
    orderId,
    paymentId,
    buyerId,
    subtotal: amount,
    taxAmount: 0,
    totalAmount: amount,
    currency,
    pdfUrl: publicUrl,
    status: 'Generated'
  });

  return invoice;
};

module.exports = {
  createInvoiceForPayment,
  generateInvoicePdf,
  formatPKR
};
