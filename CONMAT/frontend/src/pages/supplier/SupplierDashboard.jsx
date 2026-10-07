import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import {
  SupplierInventoryHealthCard,
  SupplierOrderActivityCard,
} from '../../components/analytics';
import RoleNavbar from '../../components/common/RoleNavbar';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getProductStockHealth } from '../../utils/productPricing';
import './SupplierDashboard.css';

export default function SupplierDashboard() {
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [incomingOrders, setIncomingOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [productsResult, ordersResult] = await Promise.allSettled([
        api.get('/products/mine'),
        api.get('/orders/incoming'),
      ]);
      if (cancelled) return;
      setSupplierProducts(productsResult.status === 'fulfilled' ? (productsResult.value.data?.products || []) : []);
      setIncomingOrders(ordersResult.status === 'fulfilled' ? (ordersResult.value.data?.orders || []) : []);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const supplierSummary = useMemo(() => {
    const lowStockProducts = supplierProducts.filter((product) => getProductStockHealth(product).isLowStock).length;
    const outOfStockProducts = supplierProducts.filter((product) => getProductStockHealth(product).isOutOfStock).length;
    const activeProducts = supplierProducts.filter((product) => product.status === 'Active' && Number(product.stock || 0) > 0).length;
    const activeOrders = incomingOrders.filter((order) => !['Delivered', 'Cancelled'].includes(order.orderStatus));
    return {
      totalProducts: supplierProducts.length,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      inventoryValue: supplierProducts.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.wholesalePrice || product.retailPrice || 0), 0),
      incomingOrders: activeOrders.length,
      pendingOrderValue: activeOrders.reduce((sum, order) => sum + Number(order.totalAmount || order.total || 0), 0),
    };
  }, [supplierProducts, incomingOrders]);

  return (
    <>
      <RoleNavbar />

      <main className="supplier-dashboard-page workspace-page">

        {/* HERO */}

        <section className="supplier-dashboard-hero conmat-page-hero workspace-hero">

          <div className="supplier-dashboard-hero__content workspace-hero__content">
            <span className="supplier-dashboard-eyebrow">
              Supplier Workspace
            </span>

            <h1>
              Manage listings, stock levels, incoming orders and
              bulk bid opportunities.
            </h1>

            <p>
              Update inventory, review retail and wholesale orders,
              and compete for bulk buying requests across Pakistan.
            </p>

          </div>

          <aside className="supplier-dashboard-hero__stat workspace-hero__side">
            <span>Pending Orders Value</span>

            <strong>
              {formatCurrency(supplierSummary.pendingOrderValue)}
            </strong>

            <small>
              From {supplierSummary.incomingOrders} incoming orders
            </small>

          </aside>

          <div className="supplier-dashboard-hero__actions conmat-hero-actions">
            <Link
              to="/marketplace"
              className="supplier-dashboard-hero__actions-primary conmat-hero-action conmat-hero-action--primary"
            >
              <ShoppingCart size={17} />
              Browse Marketplace
            </Link>

            <Link
              to="/manage-products"
              className="supplier-dashboard-hero__actions-secondary conmat-hero-action conmat-hero-action--secondary"
            >
              <Package size={17} />
              Manage Products
            </Link>
          </div>

        </section>

        {/* SUMMARY CARDS */}

        <section
          className="supplier-dashboard-cards"
          aria-label="Supplier statistics"
        >

          <article>
            <div className="supplier-dashboard-card-icon">
              <Package size={18} />
            </div>

            <span>Total Products</span>

            <strong>
              {supplierSummary.totalProducts}
            </strong>

            <p>
              {supplierSummary.activeProducts} active listings
            </p>
          </article>

          <article>
            <div className="supplier-dashboard-card-icon">
              <AlertTriangle size={18} />
            </div>

            <span>Low Stock</span>

            <strong>
              {supplierSummary.lowStockProducts}
            </strong>

            <p>Requires attention</p>
          </article>

          <article>
            <div className="supplier-dashboard-card-icon">
              <Package size={18} />
            </div>

            <span>Out of Stock</span>

            <strong>
              {supplierSummary.outOfStockProducts}
            </strong>

            <p>Inactive listings</p>
          </article>

          <article>
            <div className="supplier-dashboard-card-icon">
              <BarChart3 size={18} />
            </div>

            <span>Inventory Value</span>

            <strong>
              {formatCurrency(supplierSummary.inventoryValue)}
            </strong>

            <p>Total stock value</p>
          </article>

        </section>

        {/* VISUAL ANALYTICS */}

        <section className="supplier-dashboard-analytics">
          <SupplierOrderActivityCard incomingOrders={incomingOrders} />
          <SupplierInventoryHealthCard supplierProducts={supplierProducts} />
        </section>

        {/* LISTS*/}

        <section className="supplier-dashboard-layout">

          {/* ACTIVE LISTINGS */}

          <div className="supplier-dashboard-panel">

            <div className="supplier-dashboard-panel__head">

              <div>
                <span>Inventory</span>
                <h2>Active Listings</h2>
              </div>

              <Link to="/manage-products">
                Manage
              </Link>

            </div>

            <div className="supplier-dashboard-list">

              {supplierProducts.slice(0, 6).map((product) => (

                <div
                  key={product.id}
                  className="supplier-dashboard-list__item"
                >

                  <div>
                    <strong>{product.name}</strong>

                    <small>
                      {product.brand} · {product.city}
                    </small>
                  </div>

                  <span
                    className={
                      product.stock === 0
                        ? 'text-danger'
                        : ''
                    }
                  >
                    {product.stock} {product.unit}s
                  </span>

                </div>

              ))}

            </div>

          </div>

          {/* RECENT ORDERS */}

          <div className="supplier-dashboard-panel">

            <div className="supplier-dashboard-panel__head">

              <div>
                <span>Incoming Orders</span>
                <h2>Recent Orders</h2>
              </div>

              <Link to="/supplier/incoming-orders">
                View All
              </Link>

            </div>

            <div className="supplier-dashboard-list">

              {incomingOrders.slice(0, 6).map((order) => (

                <div
                  key={order.id}
                  className="supplier-dashboard-list__item"
                >

                  <div>
                    <strong>{order.orderNumber}</strong>

                    <small>
                      {order.buyerRole} · {order.shippingAddress}
                    </small>
                  </div>

                  <span>
                    {formatCurrency(order.totalAmount)}
                  </span>

                </div>

              ))}

            </div>

          </div>

        </section>

      </main>
    </>
  );
}
