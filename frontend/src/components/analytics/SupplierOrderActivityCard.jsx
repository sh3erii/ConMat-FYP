import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './AnalyticsCards.css';

const lastSevenDays = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (6 - index));
  return {
    key: date.toISOString(),
    date,
    day: date.toLocaleDateString(undefined, { weekday: 'short' }),
    dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    fullDate: date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    value: 0,
  };
});

export default function SupplierOrderActivityCard({ incomingOrders = [] }) {
  const orderActivity = useMemo(() => {
    const days = lastSevenDays();
    incomingOrders.forEach((order) => {
      const created = new Date(order.createdAt || order.orderDate || 0);
      if (Number.isNaN(created.getTime())) return;
      const row = days.find((item) => item.date.toDateString() === created.toDateString());
      if (row) row.value += 1;
    });
    return days;
  }, [incomingOrders]);
  const hasRecentOrderActivity = orderActivity.some((item) => item.value > 0);

  return (
    <div className="supplier-dashboard-panel supplier-dashboard-chart-panel supplier-order-activity-card">
      <div className="supplier-dashboard-panel__head">
        <div>
          <span>Order Activity</span>
          <h2>Orders created per day</h2>
        </div>
        <div className="supplier-dashboard-chart-period">Last 7 days</div>
      </div>
      <p className="supplier-dashboard-chart-description">
        Each bar is the number of incoming orders placed on that date.
      </p>
      <div className="supplier-dashboard-chart" aria-label="Incoming orders created each day for the last seven days">
        {hasRecentOrderActivity ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderActivity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="supplierOrderBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                cursor={{ fill: '#fff7ed' }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                formatter={(value) => [`${value} order${Number(value) === 1 ? '' : 's'}`, 'Orders created']}
                wrapperClassName="supplier-order-activity-tooltip"
              />
              <Bar dataKey="value" name="Orders created" fill="url(#supplierOrderBar)" radius={[7, 7, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="supplier-dashboard-chart-empty">
            <BarChart3 size={28} />
            <strong>No incoming orders in the last 7 days</strong>
            <span>New paid or pending orders will appear here by creation date.</span>
          </div>
        )}
      </div>
    </div>
  );
}
