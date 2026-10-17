import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import './AnalyticsCards.css';

const monthRows = () => Array.from({ length: 6 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - (5 - index));
  return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString(undefined, { month: 'short' }), spend: 0 };
});

export default function CustomerPaidSpendingCard({ paidOrders = [] }) {
  const spendingData = useMemo(() => {
    const rows = monthRows();
    paidOrders.forEach((order) => {
      const date = new Date(order.createdAt || order.orderDate || 0);
      if (Number.isNaN(date.getTime())) return;
      const row = rows.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (row) row.spend += Number(order.total || order.totalAmount || 0);
    });
    return rows;
  }, [paidOrders]);
  const hasSpendingData = spendingData.some((item) => item.spend > 0);

  return (
    <div className="customer-dashboard-panel customer-paid-spending-card">
      <div className="customer-dashboard-panel__head">
        <div>
          <div className="customer-dashboard-section-label">
            <TrendingUp size={14} />
            Procurement Analytics
          </div>
          <h2>Paid spending by month</h2>
        </div>
        <span className="customer-dashboard-period">Last 6 months</span>
      </div>
      <p className="dashboard-chart-description">
        Total value of successfully paid orders, grouped by order month.
      </p>
      <div className="customer-dashboard-chart">
        {hasSpendingData ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={spendingData} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="customerSpendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(value) => `PKR ${Math.round(value / 1000)}k`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Paid spend']}
                wrapperClassName="customer-paid-spending-tooltip"
              />
              <Area
                type="monotone"
                dataKey="spend"
                stroke="#f97316"
                strokeWidth={3}
                fill="url(#customerSpendArea)"
                dot={{ r: 4, fill: '#f97316' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="dashboard-chart-empty">
            <strong>No paid spending yet</strong>
            <span>Completed payments will build this six-month trend.</span>
          </div>
        )}
      </div>
    </div>
  );
}
