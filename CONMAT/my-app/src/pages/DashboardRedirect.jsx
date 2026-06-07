import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Boxes, ClipboardList, LogOut, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DashboardRedirect.css';
import './LandingPage.css';

const roleContent = {
  Admin: {
    title: 'Admin Dashboard',
    subtitle: 'Verify sellers, monitor orders, manage products and review platform reports.',
    cards: ['Pending supplier approvals', 'User management', 'Product moderation', 'System reports']
  },
  Supplier: {
    title: 'Supplier Dashboard',
    subtitle: 'Manage listings, stock levels, incoming orders and bulk bid opportunities.',
    cards: ['My product listings', 'Incoming orders', 'Bulk bid requests', 'Inventory alerts']
  },
  Wholesaler: {
    title: 'Wholesaler Dashboard',
    subtitle: 'Place bulk orders, compare bids and manage wholesale procurement.',
    cards: ['Bulk order request', 'My bids', 'Wholesale pricing', 'Order history']
  },
  Retailer: {
    title: 'Retailer Dashboard',
    subtitle: 'Buy materials in smaller quantities, request bids and track procurement.',
    cards: ['Marketplace', 'Retail orders', 'Bid requests', 'Payment invoices']
  },
  Customer: {
    title: 'Customer Dashboard',
    subtitle: 'Browse construction materials, place orders, pay securely and download invoices.',
    cards: ['Marketplace', 'Active orders', 'Recent procurement', 'Invoices']
  }
};

const metrics = [
  { icon: Boxes, label: 'Product APIs', value: 'Day 2', note: 'Rehman batch' },
  { icon: ShoppingCart, label: 'Payments', value: 'Ready', note: 'Nosherwan batch' },
  { icon: ClipboardList, label: 'Bidding', value: 'Ready', note: 'Nosherwan batch' },
  { icon: BarChart3, label: 'Dashboards', value: 'Shell', note: 'Talha batch' }
];

export default function DashboardRedirect() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const content = roleContent[user?.role] || roleContent.Customer;

  return (
    <main className="dashboard-redirect">
      <aside className="dashboard-redirect__sidebar">
        <Link className="dashboard-redirect__brand d-flex align-items-center gap-2" to="/">
          <span className="logo-icon d-flex align-items-center justify-content-center fw-bold text-white shadow-sm">
            C
          </span>
          <strong className="text-brand" style={{ fontWeight: 800 }}>ConMat</strong>
        </Link>

        <nav className="dashboard-redirect__nav">
          <Link to="/dashboard" className="dashboard-redirect__nav-active">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/analytics">Analytics</Link>
        </nav>

        <button className="dashboard-redirect__logout" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <section className="dashboard-redirect__content">
        {location.state?.message && (
          <div className="dashboard-redirect__welcome">{location.state.message}</div>
        )}

        <header className="dashboard-redirect__header">
          <div>
            <span className="dashboard-redirect__role"><ShieldCheck size={16} /> {user?.role}</span>
            <h1>{content.title}</h1>
            <p>{content.subtitle}</p>
          </div>
          <div className="dashboard-redirect__user-card">
            <small>Logged in as</small>
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </header>

        <section className="dashboard-redirect__metrics">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label}>
                <Icon size={22} />
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
                <small>{metric.note}</small>
              </article>
            );
          })}
        </section>

        <section className="dashboard-redirect__tasks">
          <div className="dashboard-redirect__section-title">
            <h2>{user?.role} quick actions</h2>
            <p>These cards are frontend-ready shells. Their APIs are being added in Day 2 backend work.</p>
          </div>
          <div className="dashboard-redirect__task-grid">
            {content.cards.map((card, index) => (
              <article key={card} className="dashboard-redirect__task-card">
                <span>0{index + 1}</span>
                <h3>{card}</h3>
                <p>UI route and API wiring will continue in the next batch after today's backend endpoints are merged.</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
