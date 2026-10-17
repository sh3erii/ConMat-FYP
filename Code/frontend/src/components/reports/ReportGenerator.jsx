import { useMemo, useState } from 'react';
import { BarChart3, Download, LoaderCircle, Printer } from 'lucide-react';
import { getMyTransactionReport, getPlatformTransactionReport } from '../../services/reportService';
import formatCurrency from '../../utils/formatCurrency';
import { downloadReportPdf, printReport } from '../../utils/reportExport';
import './ReportGenerator.css';

const TYPES_BY_ROLE = {
  Customer: [{ value: 'buying', label: 'Buying report' }],
  Retailer: [{ value: 'selling', label: 'Selling report' }],
  Supplier: [{ value: 'selling', label: 'Selling report' }],
  Wholesaler: [
    { value: 'combined', label: 'Combined buying and selling' },
    { value: 'buying', label: 'Buying report' },
    { value: 'selling', label: 'Selling report' },
  ],
  Admin: [{ value: 'platform', label: 'Platform transaction report' }],
};

const ORDER_STATUSES = ['All', 'Placed', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Payment Issue', 'Cancelled'];
const PAYMENT_STATUSES = ['All', 'Pending', 'Paid', 'Failed', 'Refunded'];
const dateInputValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const dateTime = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('en-PK');
};

const summaryCards = (report) => {
  const summary = report.summary || {};
  const cards = [
    { label: 'Report records', value: Number(summary.recordCount || 0).toLocaleString() },
    { label: 'Total quantity', value: Number(summary.totalQuantity || 0).toLocaleString() },
  ];
  if (['buying', 'combined'].includes(report.scope)) cards.push({ label: 'Purchase value', value: formatCurrency(summary.buyingAmount) });
  if (['selling', 'combined'].includes(report.scope)) {
    cards.push({ label: 'Gross sales', value: formatCurrency(summary.sellingGross) });
    cards.push({ label: 'Commission recorded', value: formatCurrency(summary.commissionAmount) });
    cards.push({ label: 'Net payout recorded', value: formatCurrency(summary.sellerNetAmount) });
  }
  if (report.scope === 'platform') {
    cards.push({ label: 'Total order value', value: formatCurrency(summary.platformOrderValue) });
    cards.push({ label: 'Paid order value', value: formatCurrency(summary.paidAmount) });
    cards.push({ label: 'Commission recorded', value: formatCurrency(summary.commissionAmount) });
    cards.push({ label: 'Seller payouts recorded', value: formatCurrency(summary.sellerNetAmount) });
  }
  return cards;
};

export default function ReportGenerator({ user, adminMode = false }) {
  const options = useMemo(() => TYPES_BY_ROLE[user?.role] || [], [user?.role]);
  const [filters, setFilters] = useState(() => ({
    reportType: options[0]?.value || '',
    period: 'all',
    date: dateInputValue(),
    month: dateInputValue().slice(0, 7),
    from: '',
    to: '',
    orderStatus: 'All',
    paymentStatus: 'All',
  }));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  if (!options.length) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setReport(null);
    setMessage('');
  };

  const buildParams = () => {
    if (filters.period === 'day' && !filters.date) throw new Error('Select a report date.');
    if (filters.period === 'month' && !filters.month) throw new Error('Select a report month.');
    if (filters.period === 'custom') {
      if (!filters.from || !filters.to) throw new Error('Select both start and end date and time.');
      if (new Date(filters.from) > new Date(filters.to)) throw new Error('Start date and time must be before the end date and time.');
    }
    return {
      reportType: filters.reportType || options[0].value,
      period: filters.period,
      date: filters.period === 'day' ? filters.date : undefined,
      month: filters.period === 'month' ? filters.month : undefined,
      from: filters.period === 'custom' ? new Date(filters.from).toISOString() : undefined,
      to: filters.period === 'custom' ? new Date(filters.to).toISOString() : undefined,
      orderStatus: filters.orderStatus,
      paymentStatus: filters.paymentStatus,
    };
  };

  const generate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const params = buildParams();
      const data = adminMode || user.role === 'Admin'
        ? await getPlatformTransactionReport(params)
        : await getMyTransactionReport(params);
      setReport(data);
    } catch (error) {
      setReport(null);
      setMessage(error.response?.data?.message || error.message || 'Unable to generate this report.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    setExporting(true);
    setMessage('');
    try {
      await downloadReportPdf(report);
    } catch (error) {
      setMessage(error.message || 'Unable to download the PDF report.');
    } finally {
      setExporting(false);
    }
  };

  const print = () => {
    setMessage('');
    try {
      printReport(report);
    } catch (error) {
      setMessage(error.message || 'Unable to open the print view.');
    }
  };

  return (
    <section className="report-generator" aria-labelledby="report-generator-title">
      <div className="report-generator__heading">
        <div className="report-generator__icon"><BarChart3 aria-hidden="true" /></div>
        <div>
          <span>Reports</span>
          <h2 id="report-generator-title">Generate {user.role === 'Admin' ? 'platform' : 'account'} reports</h2>
          <p>Filter transaction activity, review totals, then download a PDF or open a print-ready copy.</p>
        </div>
      </div>

      <form className="report-generator__filters" onSubmit={generate}>
        <label>
          Report type
          <select name="reportType" value={filters.reportType || options[0].value} onChange={handleChange}>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          Order date period
          <select name="period" value={filters.period} onChange={handleChange}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="day">Specific date</option>
            <option value="month">Specific month</option>
            <option value="custom">Custom date and time</option>
          </select>
        </label>
        {filters.period === 'day' && (
          <label>Date<input type="date" name="date" value={filters.date} onChange={handleChange} required /></label>
        )}
        {filters.period === 'month' && (
          <label>Month<input type="month" name="month" value={filters.month} onChange={handleChange} required /></label>
        )}
        {filters.period === 'custom' && (
          <>
            <label>From<input type="datetime-local" name="from" value={filters.from} onChange={handleChange} required /></label>
            <label>To<input type="datetime-local" name="to" value={filters.to} onChange={handleChange} required /></label>
          </>
        )}
        <label>
          Order status
          <select name="orderStatus" value={filters.orderStatus} onChange={handleChange}>
            {ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Payment status
          <select name="paymentStatus" value={filters.paymentStatus} onChange={handleChange}>
            {PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="report-generator__spinner" aria-hidden="true" /> : <BarChart3 size={17} aria-hidden="true" />}
          {loading ? 'Generating...' : 'Generate report'}
        </button>
      </form>

      {message && <div className="report-generator__message" role="alert">{message}</div>}

      {report && (
        <div className="report-generator__result">
          <div className="report-generator__result-head">
            <div>
              <span>{report.filters?.label || 'Report period'}</span>
              <h3>{report.title}</h3>
              <p>Generated {dateTime(report.generatedAt)} · {report.summary?.orderCount || 0} orders</p>
            </div>
            <div className="report-generator__actions">
              <button type="button" onClick={downloadPdf} disabled={exporting}>
                {exporting ? <LoaderCircle className="report-generator__spinner" /> : <Download size={17} />}
                {exporting ? 'Preparing PDF...' : 'Download PDF'}
              </button>
              <button type="button" onClick={print}><Printer size={17} /> Print</button>
            </div>
          </div>

          <div className="report-generator__summary">
            {summaryCards(report).map((card) => (
              <article key={card.label}><span>{card.label}</span><strong>{card.value}</strong></article>
            ))}
          </div>

          <div className="report-generator__table-wrap">
            <table>
              <thead><tr><th>Date & time</th><th>Type</th><th>Order</th><th>Counterparty</th><th>Items</th><th>Status</th><th>Amount</th></tr></thead>
              <tbody>
                {(report.rows || []).map((row) => (
                  <tr key={row.id}>
                    <td>{dateTime(row.occurredAt)}</td>
                    <td><span className={`report-generator__type is-${row.reportType.toLowerCase()}`}>{row.reportType}</span></td>
                    <td>{row.orderNumber}</td>
                    <td>{row.counterparty}</td>
                    <td>{row.items || 'No item details'}<small>{row.quantity} units · {row.pricingTypes || 'standard pricing'}</small></td>
                    <td>{row.orderStatus}<small>{row.paymentStatus}{row.payoutStatus ? ` · Payout: ${row.payoutStatus}` : ''}</small></td>
                    <td><strong>{formatCurrency(row.amount)}</strong></td>
                  </tr>
                ))}
                {!report.rows?.length && <tr><td colSpan="7" className="report-generator__empty">No transactions matched the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
