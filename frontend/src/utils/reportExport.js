const money = (value = 0) => `PKR ${new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 2,
}).format(Number(value) || 0)}`;

const displayDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString('en-PK');
};

const safeFileName = (value) => String(value || 'conmat-report')
  .replace(/[^a-z0-9_-]+/gi, '-')
  .replace(/^-+|-+$/g, '') || 'conmat-report';

const compact = (value, maximum = 180) => {
  const text = String(value || '—');
  return text.length > maximum ? `${text.slice(0, maximum - 3)}...` : text;
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const summaryEntries = (report) => {
  const summary = report?.summary || {};
  const entries = [
    ['Records', summary.recordCount],
    ['Orders', summary.orderCount],
    ['Quantity', summary.totalQuantity],
  ];
  if (report?.scope === 'buying' || report?.scope === 'combined') entries.push(['Purchases', money(summary.buyingAmount)]);
  if (report?.scope === 'selling' || report?.scope === 'combined') {
    entries.push(['Gross sales', money(summary.sellingGross)]);
    entries.push(['Commission', money(summary.commissionAmount)]);
    entries.push(['Recorded net payout', money(summary.sellerNetAmount)]);
  }
  if (report?.scope === 'platform') {
    entries.push(['Order value', money(summary.platformOrderValue)]);
    entries.push(['Paid value', money(summary.paidAmount)]);
    entries.push(['Commission', money(summary.commissionAmount)]);
    entries.push(['Recorded seller payouts', money(summary.sellerNetAmount)]);
  }
  entries.push(['Cancelled orders', summary.cancelledOrders]);
  return entries;
};

export async function downloadReportPdf(report) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = 12;

  pdf.setFillColor(28, 35, 51);
  pdf.roundedRect(margin, y, pageWidth - (margin * 2), 29, 4, 4, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(249, 115, 22);
  pdf.setFontSize(10);
  pdf.text('CONMAT', margin + 7, y + 8);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17);
  pdf.text(compact(report.title, 70), margin + 7, y + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Generated: ${displayDateTime(report.generatedAt)}`, pageWidth - margin - 7, y + 10, { align: 'right' });
  pdf.text(`Period: ${report.filters?.label || 'All time'}`, pageWidth - margin - 7, y + 17, { align: 'right' });
  pdf.text(`Order: ${report.filters?.orderStatus || 'All'} | Payment: ${report.filters?.paymentStatus || 'All'}`, pageWidth - margin - 7, y + 24, { align: 'right' });
  y += 36;

  const summaries = summaryEntries(report);
  pdf.setFontSize(8);
  summaries.forEach(([label, value], index) => {
    const x = margin + ((index % 4) * 68);
    if (index > 0 && index % 4 === 0) y += 9;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${label}:`, x, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);
    pdf.text(compact(value, 28), x + 23, y);
  });
  y += 8;

  const columns = [
    { label: 'DATE', x: 12, width: 29 },
    { label: 'TYPE', x: 42, width: 17 },
    { label: 'ORDER', x: 60, width: 28 },
    { label: 'COUNTERPARTY', x: 89, width: 48 },
    { label: 'ITEMS', x: 138, width: 68 },
    { label: 'STATUS', x: 207, width: 31 },
    { label: 'AMOUNT', x: 239, width: 46 },
  ];

  const drawHeader = () => {
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y, pageWidth - (margin * 2), 9, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(71, 85, 105);
    columns.forEach((column) => pdf.text(column.label, column.x + 1, y + 6));
    y += 9;
  };

  drawHeader();
  (report.rows || []).forEach((row) => {
    const values = [
      displayDateTime(row.occurredAt),
      row.reportType,
      row.orderNumber,
      compact(row.counterparty),
      compact(row.items),
      `${row.orderStatus} / ${row.paymentStatus}`,
      money(row.amount),
    ];
    const lines = values.map((value, index) => pdf.splitTextToSize(String(value || '—'), columns[index].width - 2));
    const rowHeight = Math.max(9, Math.min(25, Math.max(...lines.map((value) => value.length)) * 3.6 + 3));
    if (y + rowHeight > pageHeight - 16) {
      pdf.addPage();
      y = 12;
      drawHeader();
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    lines.forEach((value, index) => pdf.text(value.slice(0, 6), columns[index].x + 1, y + 5));
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    y += rowHeight;
  });

  if (!(report.rows || []).length) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No transactions matched the selected filters.', margin + 2, y + 7);
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated for ${compact(report.owner?.name || report.owner?.role, 50)} by ConMat`, margin, pageHeight - 7);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  pdf.save(`${safeFileName(report.title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function printReport(report) {
  const popup = window.open('', '_blank', 'width=1200,height=800');
  if (!popup) throw new Error('Allow pop-ups to print this report.');
  popup.opener = null;
  const summary = summaryEntries(report)
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('');
  const rows = (report.rows || []).map((row) => `
    <tr>
      <td>${escapeHtml(displayDateTime(row.occurredAt))}</td>
      <td>${escapeHtml(row.reportType)}</td>
      <td>${escapeHtml(row.orderNumber)}</td>
      <td>${escapeHtml(row.counterparty)}</td>
      <td>${escapeHtml(row.items)}</td>
      <td>${escapeHtml(row.orderStatus)}<br><small>${escapeHtml(row.paymentStatus)}</small></td>
      <td>${escapeHtml(money(row.amount))}</td>
    </tr>`).join('');
  const content = `<!doctype html><html><head><title>${escapeHtml(report.title)}</title><style>
    @page{size:landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#0f172a;margin:0}header{background:#1c2333;color:#fff;padding:22px;border-radius:12px}header b{color:#f97316}header h1{margin:7px 0;font-size:24px}header p{margin:3px 0;color:#cbd5e1}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.summary div{border:1px solid #e2e8f0;border-radius:9px;padding:9px}.summary span{display:block;color:#64748b;font-size:10px;text-transform:uppercase}.summary strong{display:block;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #e2e8f0;padding:7px;text-align:left;vertical-align:top}th{background:#f1f5f9;color:#475569}small{color:#64748b}footer{margin-top:12px;color:#64748b;font-size:9px}@media print{button{display:none}}
  </style></head><body><header><b>CONMAT</b><h1>${escapeHtml(report.title)}</h1><p>Generated ${escapeHtml(displayDateTime(report.generatedAt))}</p><p>${escapeHtml(report.filters?.label || 'All time')} | Order: ${escapeHtml(report.filters?.orderStatus || 'All')} | Payment: ${escapeHtml(report.filters?.paymentStatus || 'All')}</p></header><section class="summary">${summary}</section><table><thead><tr><th>Date & time</th><th>Type</th><th>Order</th><th>Counterparty</th><th>Items</th><th>Status</th><th>Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No transactions matched the selected filters.</td></tr>'}</tbody></table><footer>Generated for ${escapeHtml(report.owner?.name || report.owner?.role)} by ConMat</footer><script>window.addEventListener('load',()=>{window.print();});</script></body></html>`;
  popup.document.open();
  popup.document.write(content);
  popup.document.close();
}
