import { useMemo } from 'react';
import { Package } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import './AnalyticsCards.css';

export default function CustomerCategorySpendingCard({ paidOrders = [] }) {
  const categoryData = useMemo(() => {
    const totals = {};
    paidOrders.forEach((order) => (order.items || []).forEach((item) => {
      const category = item.category || 'Other';
      totals[category] = (totals[category] || 0) + Number(item.lineTotal || item.subtotal || (Number(item.unitPrice || 0) * Number(item.quantity || 0)));
    }));
    return Object.entries(totals).map(([category, spend]) => ({ category, spend })).sort((a, b) => b.spend - a.spend).slice(0, 6);
  }, [paidOrders]);
  const hasCategoryData = categoryData.some((item) => item.spend > 0);

  return (
    <div className="customer-dashboard-panel customer-category-spending-card">
      <div className="customer-dashboard-panel__head">
        <div>
          <div className="customer-dashboard-section-label">
            <Package size={14} />
            Material Spend
          </div>
          <h2>Paid spend by category</h2>
        </div>
      </div>
      <p className="dashboard-chart-description">
        Material categories ranked by value across successfully paid orders.
      </p>
      <div className="customer-dashboard-chart">
        {hasCategoryData ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(value) => `PKR ${Math.round(value / 1000)}k`}
              />
              <YAxis
                type="category"
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                width={78}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Paid spend']}
                wrapperClassName="customer-category-spending-tooltip"
              />
              <Bar dataKey="spend" fill="#f97316" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="dashboard-chart-empty">
            <strong>No category spending yet</strong>
            <span>Paid order items will appear here by material category.</span>
          </div>
        )}
      </div>
    </div>
  );
}
