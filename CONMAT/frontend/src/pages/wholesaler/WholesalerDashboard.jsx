import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  PackageSearch,
  ShoppingCart,
  TrendingDown
} from 'lucide-react';

import RoleNavbar from '../../components/common/RoleNavbar';
import {
  CustomerCategorySpendingCard,
  CustomerPaidSpendingCard,
  SupplierInventoryHealthCard,
  SupplierOrderActivityCard,
} from '../../components/analytics';
import api from '../../services/api';
import { getMyBulkRequests } from '../../services/bulkBuyingService';
import { getMyOrders } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';

import './WholesalerDashboard.css';

export default function WholesalerDashboard() {
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [incomingSellerOrders, setIncomingSellerOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [requestResult, orderResult, sellerProductsResult, incomingOrdersResult] = await Promise.allSettled([
        getMyBulkRequests(),
        getMyOrders(),
        api.get('/products/mine'),
        api.get('/orders/incoming'),
      ]);
      if (cancelled) return;
      const requestRows = requestResult.status === 'fulfilled'
        ? (requestResult.value.requests || requestResult.value.bidRequests || requestResult.value.data || [])
        : [];
      setRequests(requestRows.map((request) => ({ ...request, status: request.requestStatus || request.status, offers: Number(request.offersCount ?? request.offers ?? 0) })));
      setOrders(orderResult.status === 'fulfilled' ? (orderResult.value.orders || orderResult.value.data || []) : []);
      setSellerProducts(sellerProductsResult.status === 'fulfilled' ? (sellerProductsResult.value.data?.products || []) : []);
      setIncomingSellerOrders(incomingOrdersResult.status === 'fulfilled' ? (incomingOrdersResult.value.data?.orders || []) : []);
    };
    load();
    const refreshRequests = async () => {
      try {
        const response = await getMyBulkRequests();
        if (cancelled) return;
        const rows = response.requests || response.bidRequests || response.data || [];
        setRequests(rows.map((request) => ({
          ...request,
          status: request.requestStatus || request.status,
          offers: Number(request.offersCount ?? request.offers ?? 0),
        })));
      } catch {
        // Keep the last successful dashboard snapshot during a transient refresh failure.
      }
    };
    const refreshTimer = window.setInterval(refreshRequests, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const openRequests = requests.filter((request) => request.status === 'Open');
  const paidOrders = useMemo(() => orders.filter((order) => (
    String(order.paymentStatus || '').toLowerCase() === 'paid'
  )), [orders]);
  const bulkBuyerStats = useMemo(() => [
    { id: 'requests', label: 'Open Requests', value: openRequests.length, helper: 'Active bulk requirements' },
    { id: 'offers', label: 'Offers Received', value: requests.reduce((sum, request) => sum + Number(request.offers || 0), 0), helper: 'Across your requests' },
    { id: 'orders', label: 'Orders', value: orders.length, helper: 'Procurement orders' },
    { id: 'delivered', label: 'Delivered', value: orders.filter((order) => ['Delivered', 'Completed'].includes(order.status || order.orderStatus)).length, helper: 'Completed procurement' },
  ], [openRequests.length, requests, orders]);

  const targetValue = openRequests.reduce((sum, request) => sum + Number(request.targetPrice || 0) * Number(request.requiredQuantity || 0), 0);

  return (
    <>
      <RoleNavbar />

      <main className="wholesaler-dashboard-page workspace-page">

        {/* HERO */}

        <section className="wholesaler-dashboard-hero conmat-page-hero workspace-hero">

          <div className="wholesaler-dashboard-hero__content workspace-hero__content">

            <span className="wholesaler-dashboard-eyebrow">
              Wholesaler Workspace
            </span>

            <h1>
              Manage bulk procurement, supplier bidding and
              project orders.
            </h1>

            <p>
              Create bulk material requirements, compare verified supplier
              prices and move accepted bids into confirmed orders.
            </p>

          </div>


          {/* SAVING CARD */}

          <aside className="wholesaler-dashboard-hero__saving workspace-hero__side">

            <div className="wholesaler-dashboard-saving-top">
              <span>Best Current Saving</span>
              <TrendingDown size={18} />
            </div>

            <strong>
              {formatCurrency(targetValue)}
            </strong>

            <p>
              Combined target value of currently open bulk requests.
            </p>

            <Link
              to="/bids?view=requests"
              className="wholesaler-dashboard-saving-link"
            >
              Review offer
              <ArrowRight size={15} />
            </Link>

          </aside>

          <div className="wholesaler-dashboard-actions conmat-hero-actions">
            <Link
              to="/marketplace"
              className="wholesaler-dashboard-actions__primary conmat-hero-action conmat-hero-action--primary"
            >
              <ShoppingCart size={17} />
              Browse Marketplace
            </Link>

            <Link
              to="/bids?view=requests"
              className="wholesaler-dashboard-actions__secondary conmat-hero-action conmat-hero-action--secondary"
            >
              <BarChart3 size={17} />
              Compare Offers
            </Link>
          </div>

        </section>


        {/* STATS */}

        <section className="wholesaler-dashboard-stats">

          {bulkBuyerStats.map((stat) => (
            <article key={stat.id}>

              <span>
                {stat.label}
              </span>

              <strong>
                {stat.value}
              </strong>

              <small>
                {stat.helper}
              </small>

            </article>
          ))}

        </section>


        {/* ANALYTICS*/}

        <section className="wholesaler-dashboard-analytics">
          <CustomerPaidSpendingCard paidOrders={paidOrders} />
          <CustomerCategorySpendingCard paidOrders={paidOrders} />
          <SupplierOrderActivityCard incomingOrders={incomingSellerOrders} />
          <SupplierInventoryHealthCard supplierProducts={sellerProducts} />
        </section>


        {/* REQUESTS + TIPS */}

        <section className="wholesaler-dashboard-grid">

          {/* BULK REQUESTS */}

          <div className="wholesaler-dashboard-panel wholesaler-dashboard-panel--wide">

            <div className="wholesaler-dashboard-panel__head">

              <div>

                <div className="wholesaler-dashboard-section-label">
                  <ClipboardList size={14} />
                  Open Requests
                </div>

                <h2>
                  Bulk buying pipeline
                </h2>

              </div>

            </div>

            <div className="wholesaler-dashboard-table-wrap">

              <table className="wholesaler-dashboard-table">

                <thead>
                  <tr>
                    <th>Request</th>
                    <th>City</th>
                    <th>Quantity</th>
                    <th>Target</th>
                    <th>Offers</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {openRequests.map((request) => (

                    <tr key={request.id}>

                      <td>
                        {request.title}
                      </td>

                      <td>
                        {request.city}
                      </td>

                      <td>
                        {request.requiredQuantity} {request.unit}
                      </td>

                      <td>
                        {formatCurrency(request.targetPrice)}
                      </td>

                      <td>
                        {request.offers}
                      </td>

                      <td>
                        <Link
                          to={`/bids/compare/${request.id}`}
                        >
                          Compare
                        </Link>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>


          {/* PROCUREMENT TIPS */}

          <aside className="wholesaler-dashboard-panel">

            <div className="wholesaler-dashboard-panel__head">

              <div>

                <div className="wholesaler-dashboard-section-label">
                  <PackageSearch size={14} />
                  Procurement Tips
                </div>

                <h2>
                  Today's focus
                </h2>

              </div>

            </div>

            <div className="wholesaler-dashboard-tips">

              <p>
                Compare delivery days, supplier rating and stock
                commitment before accepting an offer.
              </p>

              <p>
                Use pricing slabs for large quantity requests to
                get accurate wholesale pricing.
              </p>

              <p>
                Convert an accepted bid into an order only after
                the final delivery address is confirmed.
              </p>

            </div>

          </aside>

        </section>


      </main>
    </>
  );
}
