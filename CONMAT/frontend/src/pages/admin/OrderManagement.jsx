import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  CreditCard,
  Search,
  Truck,
  CircleX,
} from 'lucide-react';

import RoleNavbar from '../../components/common/RoleNavbar';
import AdminOrderTable from '../../components/admin/AdminOrderTable';
import StatusFilterTabs from '../../components/admin/StatusFilterTabs';

const orderStatusOptions = ['All', 'Placed', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Payment Issue', 'Cancelled'];

import {
  fetchAdminOrders,
} from '../../services/adminManagementService';

import './OrderManagement.css';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeline, setSelectedTimeline] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      setLoading(true);
      const orderList = await fetchAdminOrders();

      if (mounted) {
        setOrders(orderList);
        setLoading(false);
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesOrderStatus =
        activeStatus === 'All' || (order.items || []).some(
          (item) => item.fulfillmentStatus === activeStatus
        );

      const matchesPayment =
        paymentStatus === 'All' ||
        order.paymentStatus === paymentStatus;

      const matchesKeyword =
        !keyword ||
        order.orderNumber?.toLowerCase().includes(keyword) ||
        order.buyerName?.toLowerCase().includes(keyword) ||
        order.sellerName?.toLowerCase().includes(keyword) ||
        order.city?.toLowerCase().includes(keyword);

      return (
        matchesOrderStatus &&
        matchesPayment &&
        matchesKeyword
      );
    });
  }, [activeStatus, orders, paymentStatus, searchTerm]);

  const stats = useMemo(
    () => ({
      total: orders.length,

      paid: orders.filter(
        (order) => order.paymentStatus === 'Paid'
      ).length,

      active: orders.filter((order) =>
        ['Confirmed', 'Processing', 'Packed', 'Dispatched'].includes(
          order.fulfillmentStatus || order.orderStatus
        )
      ).length,

      paymentIssues: orders.filter(
        (order) =>
          order.paymentStatus === 'Failed' ||
          (order.items || []).some((item) => item.fulfillmentStatus === 'Payment Issue')
      ).length,
    }),
    [orders]
  );

  function handleViewTimeline(order) {
    setSelectedTimeline({
      order,
      events: [
        {
          title: 'Order Placed',
          detail: `${order.buyerName} placed the order.`,
          date: order.placedAt,
        },
        {
          title: 'Payment Status',
          detail: `Payment is ${order.paymentStatus}.`,
          date: order.placedAt,
        },
        {
          title: 'Current Status',
          detail: `Order is currently ${order.fulfillmentStatus || order.orderStatus}.`,
          date: 'Today',
        },
        ...(order.items || []).map((item) => ({
          title: item.productName,
          detail: `${item.sellerName}: ${item.fulfillmentStatus}`,
          date: item.deliveryWindow || '2–3 days',
        })),
      ],
    });
  }

  return (
    <>
      <RoleNavbar />

      <main className="order-management-page workspace-page">

        {/* HERO */}
        <section className="order-management-hero conmat-page-hero workspace-hero">
          <div className="workspace-hero__content">
            <span className="order-management-kicker">
              Admin Workspace
            </span>

            <h1>Order Management</h1>

            <p>
              Monitor order flow, payment issues, seller dispatch
              progress, and buyer order status from one admin
              control screen.
            </p>
          </div>

          <div className="order-management-hero-card workspace-hero__side">
            <ClipboardCheck />
            <strong>{stats.total}</strong>
            <span>Total Orders</span>
          </div>
        </section>

        {/* STATS */}
        <section className="order-management-stats">

          <button
            type="button"
            onClick={() => {
              setActiveStatus('All');
              setPaymentStatus('All');
            }}
          >
            <ClipboardCheck />
            <span>Total Orders</span>
            <strong>{stats.total}</strong>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaymentStatus('Paid');
              setActiveStatus('All');
            }}
          >
            <CreditCard />
            <span>Paid Orders</span>
            <strong>{stats.paid}</strong>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveStatus('Processing');
              setPaymentStatus('All');
            }}
          >
            <Truck />
            <span>Active Flow</span>
            <strong>{stats.active}</strong>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaymentStatus('Failed');
              setActiveStatus('All');
            }}
          >
            <CircleX />
            <span>Payment Issues</span>
            <strong>{stats.paymentIssues}</strong>
          </button>

        </section>

        {/* ORDERS */}
        <section className="order-management-panel">

          <div className="order-management-toolbar">

            <div className="order-management-search">
              <Search />

              <input
                type="search"
                placeholder="Search order, buyer, seller, or city..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            <select
              className="conmat-filter-select"
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value)
              }
            >
              <option>All</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Failed</option>
              <option>Refunded</option>
            </select>

          </div>

          <div className="order-management-filters">
            <StatusFilterTabs
              options={orderStatusOptions}
              active={activeStatus}
              onChange={setActiveStatus}
            />
          </div>

          {loading && (
            <div className="order-management-loading">
              Loading order records...
            </div>
          )}

          <AdminOrderTable
            orders={filteredOrders}
            onViewTimeline={handleViewTimeline}
          />

        </section>

        {/* TIMELINE MODAL */}
        {selectedTimeline && (
          <div
            className="order-management-modal"
            onClick={() => setSelectedTimeline(null)}
          >
            <section
              className="order-management-modal-card"
              onClick={(event) => event.stopPropagation()}
            >

              <button
                type="button"
                className="order-management-modal-close"
                onClick={() => setSelectedTimeline(null)}
              >
                ×
              </button>

              <span className="order-management-kicker">
                Timeline
              </span>

              <h2>
                {selectedTimeline.order.orderNumber}
              </h2>

              <p>
                {selectedTimeline.order.buyerName} →{' '}
                {selectedTimeline.order.sellerName}
              </p>

              <div className="order-management-timeline">

                {selectedTimeline.events.map((event) => (
                  <div
                    className="order-management-timeline-item"
                    key={event.title}
                  >
                    <strong>{event.title}</strong>
                    <span>{event.detail}</span>
                    <small>{event.date}</small>
                  </div>
                ))}

              </div>

            </section>
          </div>
        )}

      </main>
    </>
  );
}
