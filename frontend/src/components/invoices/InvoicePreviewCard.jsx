import { useState } from 'react';
import { Download, LoaderCircle, Printer } from 'lucide-react';
import './InvoicePreviewCard.css';

const money = (value = 0) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);

const pdfMoney = (value = 0) =>
  `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

const displayDate = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-PK');
};

const safeFileName = (value) => String(value || 'invoice')
  .replace(/[^a-z0-9_-]+/gi, '-')
  .replace(/^-+|-+$/g, '') || 'invoice';

async function downloadInvoicePdf(invoice) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let y = 18;

  const ensureSpace = (height) => {
    if (y + height <= pageHeight - 20) return;
    pdf.addPage();
    y = 18;
  };

  const addParty = (title, party, x, width) => {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(x, y, width, 35, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 83, 9);
    pdf.text(title.toUpperCase(), x + 5, y + 7);
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(party?.name || 'Not provided'), x + 5, y + 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    const details = [party?.email, party?.phone, party?.address].filter(Boolean).join(' | ');
    pdf.text(pdf.splitTextToSize(details || 'Contact details not provided', width - 10), x + 5, y + 21);
  };

  pdf.setFillColor(28, 35, 51);
  pdf.roundedRect(margin, y, contentWidth, 38, 4, 4, 'F');
  pdf.setTextColor(249, 115, 22);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('CONMAT', margin + 7, y + 10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text('Digital Invoice', margin + 7, y + 21);
  pdf.setFontSize(10);
  pdf.text(String(invoice.invoiceNumber || invoice.invoiceId || 'Invoice'), margin + 7, y + 30);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Order: ${invoice.orderNumber || invoice.orderId || 'Not provided'}`, pageWidth - margin - 7, y + 13, { align: 'right' });
  pdf.text(`Issued: ${displayDate(invoice.invoiceDate)}`, pageWidth - margin - 7, y + 21, { align: 'right' });
  pdf.text(`Status: ${invoice.status || 'Paid'}`, pageWidth - margin - 7, y + 29, { align: 'right' });
  y += 46;

  const partyGap = 6;
  const partyWidth = (contentWidth - partyGap) / 2;
  addParty('Bill To', invoice.buyer, margin, partyWidth);
  addParty('Seller', invoice.seller, margin + partyWidth + partyGap, partyWidth);
  y += 43;

  const columns = {
    material: margin + 4,
    seller: margin + 56,
    quantity: margin + 104,
    unitPrice: margin + 130,
    total: pageWidth - margin - 4,
  };

  const drawTableHeader = () => {
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y, contentWidth, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text('MATERIAL', columns.material, y + 6.5);
    pdf.text('SELLER', columns.seller, y + 6.5);
    pdf.text('QTY', columns.quantity, y + 6.5, { align: 'right' });
    pdf.text('UNIT PRICE', columns.unitPrice, y + 6.5, { align: 'right' });
    pdf.text('TOTAL', columns.total, y + 6.5, { align: 'right' });
    y += 10;
  };

  drawTableHeader();
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  items.forEach((item) => {
    const materialLines = pdf.splitTextToSize(String(item.name || 'Material'), 48);
    const sellerName = item.seller?.name || item.sellerName || invoice.seller?.name || 'ConMat Seller';
    const sellerLines = pdf.splitTextToSize(String(sellerName), 44);
    const maxLines = Math.max(materialLines.length, sellerLines.length);
    const rowHeight = Math.max(11, (maxLines * 4) + 5);
    if (y + rowHeight > pageHeight - 28) {
      pdf.addPage();
      y = 18;
      drawTableHeader();
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(materialLines, columns.material, y + 6);
    pdf.text(sellerLines, columns.seller, y + 6);
    pdf.text(`${item.quantity ?? 0}${item.unit ? ` ${item.unit}` : ''}`, columns.quantity, y + 6, { align: 'right' });
    pdf.text(pdfMoney(item.unitPrice), columns.unitPrice, y + 6, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(pdfMoney(item.total ?? (Number(item.quantity) * Number(item.unitPrice))), columns.total, y + 6, { align: 'right' });
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    y += rowHeight;
  });

  if (!items.length) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No line items available.', columns.material, y + 7);
    y += 13;
  }

  ensureSpace(55);
  y += 7;
  const totalsX = pageWidth - margin - 76;
  const addTotal = (label, value, emphasized = false) => {
    if (emphasized) {
      pdf.setDrawColor(15, 23, 42);
      pdf.line(totalsX, y - 4, pageWidth - margin, y - 4);
    }
    pdf.setFont('helvetica', emphasized ? 'bold' : 'normal');
    pdf.setFontSize(emphasized ? 11 : 9);
    pdf.setTextColor(emphasized ? 15 : 71, emphasized ? 23 : 85, emphasized ? 42 : 105);
    pdf.text(label, totalsX, y);
    if (emphasized) pdf.setTextColor(180, 83, 9);
    pdf.text(pdfMoney(value), pageWidth - margin, y, { align: 'right' });
    y += emphasized ? 9 : 7;
  };

  addTotal('Subtotal', invoice.subtotal);
  if (Number(invoice.discount || 0) > 0) {
    addTotal('Wholesale Discount', -(Number(invoice.discount) || 0));
  }
  addTotal('Delivery', invoice.deliveryCharges);
  y += 2;
  addTotal('Grand total', invoice.grandTotal, true);

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Generated by ConMat', margin, pageHeight - 10);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  pdf.save(`${safeFileName(invoice.invoiceNumber || invoice.invoiceId)}.pdf`);
}

export default function InvoicePreviewCard({ invoice }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  if (!invoice) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadInvoicePdf(invoice);
    } catch {
      setDownloadError('Unable to download this invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="invoice-preview-card">
      <div className="invoice-preview-card__top">
        <div>
          <p>Digital Invoice</p>
          <h2>{invoice.invoiceNumber}</h2>
          <span>Order: {invoice.orderNumber}</span>
        </div>

        <div className="invoice-preview-card__actions">
          <button type="button" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </button>

          <button type="button" onClick={handleDownload} disabled={downloading}>
            {downloading ? <LoaderCircle className="invoice-preview-card__spinner" size={16} /> : <Download size={16} />}
            {downloading ? 'Preparing PDF...' : 'Download Invoice'}
          </button>
        </div>
      </div>

      {downloadError && (
        <p className="invoice-preview-card__download-error" role="alert">
          {downloadError}
        </p>
      )}

      <div className="invoice-preview-card__parties">
        <article>
          <span>Bill To</span>
          <strong>{invoice.buyer?.name}</strong>
          <p>{invoice.buyer?.email}</p>
          <p>{invoice.buyer?.phone}</p>
          <p>{invoice.buyer?.address}</p>
        </article>

        <article>
          <span>{invoice.sellers?.length > 1 ? 'Sellers' : 'Seller'}</span>
          {invoice.sellers && invoice.sellers.length > 1 ? (
            <div className="invoice-preview-card__sellers-list">
              {invoice.sellers.map((s) => (
                <div key={s.id || s.name} className="invoice-preview-card__seller-item">
                  <strong>{s.name}</strong>
                  {s.email && <p>{s.email}</p>}
                  {s.phone && <p>{s.phone}</p>}
                </div>
              ))}
            </div>
          ) : (
            <>
              <strong>{invoice.seller?.name}</strong>
              <p>{invoice.seller?.email}</p>
              <p>{invoice.seller?.phone}</p>
              <p>{invoice.seller?.address}</p>
            </>
          )}
        </article>
      </div>

      <div className="invoice-preview-card__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Seller</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {invoice.items?.map((item) => (
              <tr key={item.id || item.name}>
                <td>
                  <strong>{item.name}</strong>
                  {item.pricingType === 'wholesale' && (
                    <span className="invoice-preview-card__badge">Wholesale</span>
                  )}
                </td>
                <td>{item.seller?.name || item.sellerName || invoice.seller?.name || 'ConMat Seller'}</td>
                <td>{item.quantity} {item.unit || ''}</td>
                <td>{money(item.unitPrice)}</td>
                <td>
                  {money(item.total || item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoice-preview-card__totals">
        <p>
          <span>Subtotal</span>
          <b>{money(invoice.subtotal)}</b>
        </p>

        {Number(invoice.discount || 0) > 0 ? (
          <p className="invoice-preview-card__discount">
            <span>Wholesale Discount</span>
            <b>-{money(invoice.discount)}</b>
          </p>
        ) : (
          <p>
            <span>Discount</span>
            <b>-{money(0)}</b>
          </p>
        )}

        <p>
          <span>Delivery</span>
          <b>{Number(invoice.deliveryCharges || 0) === 0 ? 'Free' : money(invoice.deliveryCharges)}</b>
        </p>

        <p className="invoice-preview-card__grand">
          <span>Grand Total</span>
          <b>{money(invoice.grandTotal)}</b>
        </p>
      </div>
    </section>
  );
}
