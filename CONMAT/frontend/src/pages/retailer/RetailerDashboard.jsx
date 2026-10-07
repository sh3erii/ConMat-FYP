import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  PackageSearch,
  ShoppingCart,
  TrendingDown
} from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';
import {
  CustomerCategorySpendingCard,
  CustomerPaidSpendingCard,
  SupplierInventoryHealthCard,
  SupplierOrderActivityCard,
} from '../../components/analytics';
import RoleNavbar from '../../components/common/RoleNavbar';
import api from '../../services/api';
import { getMyOrders } from '../../services/orderService';
import { getMyBulkRequests } from '../../services/bulkBuyingService';

import './RetailerDashboard.css';

const normalizeRequest = (request) => {
  const storedStatus = request.requestStatus || request.status;
  const expired = storedStatus === 'Open'
    && request.expiresAt
    && new Date(request.expiresAt) < new Date();
  return {
    ...request,
    status: expired ? 'Expired' : storedStatus,
    offers: Number(request.offersCount ?? request.offers ?? 0),
  };
};

export default function RetailerDashboard() {
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [comparedProducts, setComparedProducts] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [incomingSellerOrders, setIncomingSellerOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [requestResult, orderResult, productResult, sellerProductsResult, incomingOrdersResult] = await Promise.allSettled([
        getMyBulkRequests(),
        getMyOrders(),
        api.get('/products?pricing=wholesale&sort=price_low'),
        api.get('/products/mine'),
        api.get('/orders/incoming'),
      ]);
      if (cancelled) return;
      const requestRows = requestResult.status === 'fulfilled'
        ? (requestResult.value.requests || requestResult.value.bidRequests || requestResult.value.data || [])
        : [];
      setRequests(requestRows.map(normalizeRequest));
      setOrders(orderResult.status === 'fulfilled' ? (orderResult.value.orders || orderResult.value.data || []) : []);
      const products = productResult.status === 'fulfilled' ? (productResult.value.data?.products || productResult.value.data?.data || []) : [];
      setComparedProducts(products.slice(0, 5).map((product) => ({ ...product, seller: product.sellerName || product.seller?.name || 'Seller' })));
      setSellerProducts(sellerProductsResult.status === 'fulfilled' ? (sellerProductsResult.value.data?.products || []) : []);
      setIncomingSellerOrders(incomingOrdersResult.status === 'fulfilled' ? (incomingOrdersResult.value.data?.orders || []) : []);
    };
    load();
    const refreshRequests = async () => {
      try {
        const response = await getMyBulkRequests();
        if (cancelled) return;
        const rows = response.requests || response.bidRequests || response.data || [];
        setRequests(rows.map(normalizeRequest));
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
  const retailerStats = useMemo(() => {
    const completed = orders.filter((order) => ['Delivered', 'Completed'].includes(order.status || order.orderStatus)).length;
    return [
      { id: 'requests', label: 'Open Requests', value: openRequests.length, helper: 'Active bulk requirements' },
      { id: 'offers', label: 'Offers Received', value: requests.reduce((sum, request) => sum + Number(request.offers || 0), 0), helper: 'Across your requests' },
      { id: 'orders', label: 'Orders', value: orders.length, helper: 'Total purchases' },
      { id: 'completed', label: 'Completed', value: completed, helper: 'Delivered orders' },
    ];
  }, [requests, orders, openRequests.length]);

  return (
    <>
      <RoleNavbar />

      <main className="retailer-dashboard-page workspace-page">

        {/* HERO */}

        <section className="retailer-dashboard-hero conmat-page-hero workspace-hero">

          <div className="retailer-dashboard-hero-content workspace-hero__content">

            <span className="retailer-dashboard-hero-eyebrow">
              Retailer Workspace
            </span>

            <h1>
              Buy smarter with competitive bulk pricing and
              verified supplier offers.
            </h1>

            <p>
              Create bulk requests, compare supplier bids and track
              your purchasing activity from one workspace.
            </p>

          </div>


          {/* HERO SIDE CARD */}

          <aside className="retailer-dashboard-hero-card workspace-hero__side">

            <div className="retailer-dashboard-hero-card__top">

              <span>
                Price Opportunity
              </span>

              <TrendingDown size={18} />

            </div>

            <strong>
              Compare before buying
            </strong>

            <p>
              Review multiple  offers before committing
              to a bulk order.
            </p>

            <Link
              to="/bids?view=requests"
              className="retailer-dashboard-hero-link"
            >
              Compare supplier offers
              <ArrowRight size={15} />
            </Link>

          </aside>

          <div className="retailer-dashboard-actions conmat-hero-actions">
            <Link
              to="/marketplace"
              className="retailer-dashboard-actions__primary conmat-hero-action conmat-hero-action--primary"
            >
              <ShoppingCart size={17} />
              Browse Marketplace
            </Link>

          </div>

        </section>


        {/* STATS */}

        <section className="retailer-dashboard-stats">

          {retailerStats.map((stat) => (

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


        {/* ANALYTICS */}

        <section className="retailer-dashboard-analytics">
          <CustomerPaidSpendingCard paidOrders={paidOrders} />
          <CustomerCategorySpendingCard paidOrders={paidOrders} />
          <SupplierOrderActivityCard incomingOrders={incomingSellerOrders} />
          <SupplierInventoryHealthCard supplierProducts={sellerProducts} />
        </section>


        {/* REQUESTS + PRICE WATCH */}

        <section className="retailer-dashboard-grid">

          {/* ACTIVE REQUESTS */}

          <div className="retailer-dashboard-panel">

            <div className="retailer-dashboard-panel__head">

              <div>

                <div className="retailer-dashboard-section-label">
                  <ClipboardList size={14} />
                  Active Requests
                </div>

                <h2>
                  Retail bulk requests
                </h2>

              </div>

            </div>

            <div className="retailer-dashboard-request-list">

              {requests.slice(0, 3).map((request) => (

                <article key={request.id}>

                  <div>

                    <h3>
                      {request.title}
                    </h3>

                    <p>
                      {request.city} · {request.requiredQuantity}{' '}
                      {request.unit} · {request.offers} offers
                    </p>

                  </div>

                  <Link to={`/bids/compare/${request.id}`}>
                    Compare
                  </Link>

                </article>

              ))}

            </div>

          </div>


          {/* PRICE WATCH */}

          <div className="retailer-dashboard-panel">

            <div className="retailer-dashboard-panel__head">

              <div>

                <div className="retailer-dashboard-section-label">
                  <PackageSearch size={14} />
                  Price Watch
                </div>

                <h2>
                  Recommended wholesale prices
                </h2>

              </div>

            </div>

            <div className="retailer-dashboard-products">

              {comparedProducts.map((product) => (

                <article key={product.id}>

                  <div>

                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      {product.seller} · {product.city || 'Marketplace'}
                    </p>

                  </div>

                  <strong>
                    {formatCurrency(product.unitPrice ?? product.price ?? product.wholesalePrice ?? product.retailPrice)}
                  </strong>

                </article>

              ))}

            </div>

          </div>

        </section>

      </main>
    </>
  );
}
