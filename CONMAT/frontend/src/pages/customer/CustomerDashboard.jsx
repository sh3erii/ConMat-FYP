import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
} from 'lucide-react';

import {
  CustomerCategorySpendingCard,
  CustomerPaidSpendingCard,
} from '../../components/analytics';
import BuyerSummaryCard from '../../components/common/BuyerSummaryCard';
import OrderTimeline from '../../components/common/OrderTimeline';
import RoleNavbar from '../../components/common/RoleNavbar';
import api from '../../services/api';
import { getMyOrders } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import './CustomerDashboard.css';

const emptyOrder = {
  id: '',
  orderNumber: 'No active order',
  supplier: '—',
  city: '—',
  status: 'Pending',
  deliveryDate: '—',
  timeline: [],
};

const deliverySummary = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return order?.deliveryWindow || order?.deliveryDate || 'Delivery timing pending';
  return items.map((item) => (
    `${item.name || item.productName || 'Product'}: ${item.deliveryWindow || '2–3 days'}`
  )).join(' · ');
};

export default function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [ordersResult, productsResult] = await Promise.allSettled([
        getMyOrders(),
        api.get('/products?sort=price_low'),
      ]);
      if (cancelled) return;
      setOrders(ordersResult.status === 'fulfilled' ? (ordersResult.value.orders || ordersResult.value.data || []) : []);
      if (productsResult.status === 'fulfilled') {
        const rows = productsResult.value.data?.products || productsResult.value.data?.data || [];
        setRecommendedProducts(rows.slice(0, 5).map((product) => ({
          ...product,
          seller: product.sellerName || product.seller?.name || 'Seller',
          price: product.retailPrice ?? product.unitPrice ?? 0,
        })));
      } else {
        setRecommendedProducts([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const activeOrder = orders.find((order) => !['Delivered', 'Cancelled'].includes(order.status || order.orderStatus)) || orders[0] || emptyOrder;
  const paidOrders = useMemo(() => orders.filter((order) => (
    String(order.paymentStatus || '').toLowerCase() === 'paid'
  )), [orders]);

  const buyerStats = useMemo(() => {
    const active = orders.filter((order) => !['Delivered', 'Cancelled'].includes(order.status || order.orderStatus)).length;
    const completed = orders.filter((order) => (order.status || order.orderStatus) === 'Delivered').length;
    const paidSpend = paidOrders
      .reduce((sum, order) => sum + Number(order.total || order.totalAmount || 0), 0);
    return [
      { id: 'orders', label: 'Total Orders', value: orders.length, hint: `${active} active`, tone: 'blue' },
      { id: 'active', label: 'Active Orders', value: active, hint: 'In progress', tone: 'orange' },
      { id: 'completed', label: 'Completed', value: completed, hint: 'Delivered orders', tone: 'green' },
      { id: 'spend', label: 'Paid Spend', value: formatCurrency(paidSpend), hint: 'Paid order value', tone: 'purple' },
    ];
  }, [orders, paidOrders]);

  return (
    <>
      <RoleNavbar />

      <main className="customer-dashboard-page workspace-page">

        {/* HERO */}
        <section className="customer-dashboard-hero conmat-page-hero workspace-hero">

          <div className="customer-dashboard-hero-content workspace-hero__content">

            <span className="customer-dashboard-kicker">
              Buyer Workspace
            </span>

            <h1>
              Manage procurement, orders and invoices from one place.
            </h1>

            <p>
              Track active deliveries, review recent purchases and continue
              buying verified construction materials across Pakistan.
            </p>

          </div>


          {/* Active Order */}
          <aside className="customer-dashboard-hero-card workspace-hero__side">

            <div className="customer-dashboard-hero-card__top">
              <span>Active Order</span>

              <span className="customer-dashboard-live">
                <span></span>
                Live
              </span>
            </div>

            <div className="customer-dashboard-order-icon">
              <Truck size={23} />
            </div>

            <strong>{activeOrder.orderNumber}</strong>

            <p>
              {activeOrder.supplier} · {activeOrder.city}
            </p>

            <div className="customer-dashboard-order-row">

              <span
                className={`customer-dashboard-status customer-dashboard-status--${activeOrder.status.toLowerCase()}`}
              >
                {activeOrder.status}
              </span>

              <span className="customer-dashboard-delivery-date">
                {deliverySummary(activeOrder)}
              </span>

            </div>

            <Link
              to={`/orders/${activeOrder.id}`}
              className="customer-dashboard-hero-link"
            >
              Track order
              <ArrowRight size={15} />
            </Link>

          </aside>

          <div className="customer-dashboard-actions conmat-hero-actions">
            <Link
              to="/marketplace"
              className="customer-dashboard-actions__primary conmat-hero-action conmat-hero-action--primary"
            >
              <ShoppingCart size={17} />
              Browse Marketplace
            </Link>

            <Link
              to="/orders"
              className="customer-dashboard-actions__secondary conmat-hero-action conmat-hero-action--secondary"
            >
              <Package size={17} />
              Orders
            </Link>
          </div>

        </section>


        {/* STATS */}
        <section
          className="customer-dashboard-stats"
          aria-label="Buyer statistics"
        >
          {buyerStats.map((stat) => (
            <BuyerSummaryCard
              key={stat.id}
              {...stat}
            />
          ))}
        </section>


        {/* PROCUREMENT ANALYTICS */}
        <section className="customer-dashboard-analytics">
          <CustomerPaidSpendingCard paidOrders={paidOrders} />
          <CustomerCategorySpendingCard paidOrders={paidOrders} />
        </section>


        {/* ORDER + RECOMMENDATIONS */}
        <section className="customer-dashboard-grid">

          {/* Order Progress */}
          <div className="customer-dashboard-panel">

            <div className="customer-dashboard-panel__head">

              <div>
                <div className="customer-dashboard-section-label">
                  <Truck size={14} />
                  Order Progress
                </div>

                <h2>{activeOrder.orderNumber}</h2>
              </div>

              <Link to={`/orders/${activeOrder.id}`}>
                Details
                <ArrowRight size={14} />
              </Link>

            </div>


            <div className="customer-dashboard-order-summary">

              <div>
                <span>Supplier</span>
                <strong>{activeOrder.supplier}</strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{activeOrder.city}</strong>
              </div>

              <div>
                <span>Delivery</span>
                <strong>{deliverySummary(activeOrder)}</strong>
              </div>

            </div>


            <OrderTimeline steps={activeOrder.timeline} />

          </div>


          {/* Recommendations */}
          <div className="customer-dashboard-panel">

            <div className="customer-dashboard-panel__head">

              <div>
                <div className="customer-dashboard-section-label">
                  <TrendingUp size={14} />
                  Recommended
                </div>

                <h2>Best supplier prices</h2>
              </div>

            </div>


            <div className="customer-dashboard-products">

              {recommendedProducts.map((product) => (

                <article key={product.id}>

                  <div className="customer-dashboard-product-icon">
                    <Package size={19} />
                  </div>

                  <div className="customer-dashboard-product-info">

                    <h3>{product.name}</h3>

                    <p>
                      {product.seller} · {product.city}
                    </p>

                  </div>

                  <strong>
                    {formatCurrency(product.price)}
                  </strong>

                </article>

              ))}

            </div>


            <Link
              to="/marketplace"
              className="customer-dashboard-panel-action"
            >
              Explore marketplace
              <ArrowRight size={15} />
            </Link>

          </div>

        </section>


        {/* RECENT PROCUREMENT */}
        <section className="customer-dashboard-panel">

          <div className="customer-dashboard-panel__head">

            <div>
              <div className="customer-dashboard-section-label">
                <ShoppingCart size={14} />
                Recent Procurement
              </div>

              <h2>Latest orders</h2>
            </div>

            <Link to="/orders">
              View all
              <ArrowRight size={14} />
            </Link>

          </div>


          <div className="customer-dashboard-table-wrap">

            <table className="customer-dashboard-table">

              <thead>
                <tr>
                  <th>Order</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Delivery</th>
                </tr>
              </thead>

              <tbody>

                {orders.slice(0, 6).map((order) => (

                  <tr key={order.id}>

                    <td>
                      <Link to={`/orders/${order.id}`}>
                        {order.orderNumber}
                      </Link>
                    </td>

                    <td>
                      <div className="customer-dashboard-supplier">
                        <span>
                          <Package size={14} />
                        </span>

                        {order.supplier}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`customer-dashboard-status customer-dashboard-status--${order.status.toLowerCase()}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="customer-dashboard-total">
                      {formatCurrency(order.total)}
                    </td>

                    <td>
                      <span className="customer-dashboard-delivery">
                        <Clock3 size={13} />
                        {deliverySummary(order)}
                      </span>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>


      </main>
    </>
  );
}
