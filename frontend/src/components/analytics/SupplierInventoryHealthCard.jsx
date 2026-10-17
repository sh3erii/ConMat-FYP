import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getProductStockHealth } from '../../utils/productPricing';
import './AnalyticsCards.css';

export default function SupplierInventoryHealthCard({ supplierProducts = [] }) {
  const inventoryHealth = useMemo(() => supplierProducts.reduce((health, product) => {
    const stockHealth = getProductStockHealth(product);
    if (stockHealth.isOutOfStock) health.outOfStock += 1;
    else if (stockHealth.isLowStock) health.lowStock += 1;
    else health.healthy += 1;
    health.total += 1;
    return health;
  }, { total: 0, healthy: 0, lowStock: 0, outOfStock: 0 }), [supplierProducts]);

  const healthyPercentage = inventoryHealth.total ? Math.round((inventoryHealth.healthy / inventoryHealth.total) * 100) : 0;
  const lowStockPercentage = inventoryHealth.total ? Math.round((inventoryHealth.lowStock / inventoryHealth.total) * 100) : 0;
  const lowStockEndPercentage = Math.min(100, healthyPercentage + lowStockPercentage);
  const outOfStockPercentage = inventoryHealth.total ? Math.max(0, 100 - lowStockEndPercentage) : 0;

  return (
    <div className="supplier-dashboard-panel supplier-dashboard-inventory-panel supplier-inventory-health-card">
      <div className="supplier-dashboard-panel__head">
        <div>
          <span>Inventory Health</span>
          <h2>Stock status</h2>
        </div>
        <Link to="/manage-products">Manage</Link>
      </div>
      <div className="supplier-dashboard-inventory">
        <div
          className={`supplier-dashboard-inventory__ring${inventoryHealth.total ? '' : ' supplier-dashboard-inventory__ring--empty'}`}
          role="img"
          aria-label={`${healthyPercentage}% healthy inventory, ${lowStockPercentage}% low stock, and ${outOfStockPercentage}% out of stock`}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="inventory-ring-segment inventory-ring-segment--out" cx="50" cy="50" r="42" pathLength="100" />
            <circle
              className="inventory-ring-segment inventory-ring-segment--low"
              cx="50"
              cy="50"
              r="42"
              pathLength="100"
              strokeDasharray={`${lowStockPercentage} ${100 - lowStockPercentage}`}
              strokeDashoffset={-healthyPercentage}
            />
            <circle
              className="inventory-ring-segment inventory-ring-segment--healthy"
              cx="50"
              cy="50"
              r="42"
              pathLength="100"
              strokeDasharray={`${healthyPercentage} ${100 - healthyPercentage}`}
            />
          </svg>
          <div>
            <strong>{healthyPercentage}%</strong>
            <span>Healthy</span>
          </div>
        </div>
        <div className="supplier-dashboard-inventory__legend">
          <div><span className="inventory-dot inventory-dot--active" /><p>Healthy stock</p><strong>{inventoryHealth.healthy}</strong></div>
          <div><span className="inventory-dot inventory-dot--low" /><p>Low stock</p><strong>{inventoryHealth.lowStock}</strong></div>
          <div><span className="inventory-dot inventory-dot--out" /><p>Out of stock</p><strong>{inventoryHealth.outOfStock}</strong></div>
        </div>
      </div>
      <div className="supplier-dashboard-inventory-progress">
        <svg viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true">
          <rect className="inventory-progress-track" width="100" height="9" rx="4.5" />
          <rect className="inventory-progress-healthy" width={healthyPercentage} height="9" />
          <rect className="inventory-progress-low" x={healthyPercentage} width={lowStockPercentage} height="9" />
          <rect className="inventory-progress-out" x={lowStockEndPercentage} width={outOfStockPercentage} height="9" />
        </svg>
        <small>Products grouped by their current stock level.</small>
      </div>
    </div>
  );
}
