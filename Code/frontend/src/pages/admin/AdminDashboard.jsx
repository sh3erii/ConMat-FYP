import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

import RoleNavbar from '../../components/common/RoleNavbar';
import AdminStatCard from '../../components/admin/AdminStatCard';
import SellerVerificationCard from '../../components/admin/SellerVerificationCard';

import { adminService } from '../../services/adminService';
import { getCompleteAdminAnalytics } from '../../services/adminAnalyticsService';

import './AdminDashboard.css';


export default function AdminDashboard() {

  const [summary, setSummary] = useState({
    kpis: [],
    reports: [],
    summary: {}
  });

  const [analytics, setAnalytics] = useState({ revenueTrend: [] });

  const [pendingSellers, setPendingSellers] = useState([]);

  const [notice, setNotice] = useState('');


  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const [summaryResult, sellersResult, analyticsResult] = await Promise.allSettled([
        adminService.getDashboardSummary(),
        adminService.getSellerApplications('Pending'),
        getCompleteAdminAnalytics(),
      ]);
      if (!active) return;

      if (summaryResult.status === 'fulfilled') {
        const response = summaryResult.value;
        setSummary({
          kpis: response.kpis || [],
          reports: response.reports || [],
          summary: response.summary || {}
        });
      } else {
        setNotice(summaryResult.reason?.response?.data?.message || 'Some dashboard data could not be loaded.');
      }

      setPendingSellers(sellersResult.status === 'fulfilled'
        ? (sellersResult.value.applications || []).slice(0, 2)
        : []);
      setAnalytics(analyticsResult.status === 'fulfilled'
        ? analyticsResult.value || { revenueTrend: [] }
        : { revenueTrend: [] });
    }

    loadDashboard();
    return () => { active = false; };
  }, []);


  const approveSeller = async (seller) => {
    try {
      await adminService.approveSeller(
        seller.id,
        'Approved from admin dashboard'
      );
      setPendingSellers((items) =>
        items.filter((item) => item.id !== seller.id)
      );
      setNotice(`${seller.businessName} has been approved.`);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to approve this verification.');
    }
  };


  const rejectSeller = async (seller) => {
    try {
      await adminService.rejectSeller(
        seller.id,
        'Documents need re-checking'
      );
      setPendingSellers((items) =>
        items.filter((item) => item.id !== seller.id)
      );
      setNotice(
        `${seller.businessName} has been rejected for review.`
      );
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to reject this verification.');
    }
  };


  const platformActivity = (analytics.revenueTrend || []).map((item) => ({
    month: item.label,
    paidOrders: Number(item.orders || 0),
    revenue: Number(item.revenue || 0),
  }));

  const marketplaceReports = [
    { type: 'Orders', value: Number(summary.summary?.totalOrders || 0) },
    { type: 'Sellers', value: Number(summary.summary?.verifiedSellers || 0) },
    { type: 'Users', value: Number(summary.summary?.totalUsers || 0) },
    { type: 'Bids', value: Number(summary.summary?.activeBids || 0) },
  ];
  const hasPlatformActivity = platformActivity.some((item) => item.paidOrders > 0 || item.revenue > 0);
  const hasMarketplaceActivity = marketplaceReports.some((item) => item.value > 0);


  return (
    <>
      <RoleNavbar />

      <main className="admin-dashboard-page workspace-page">


        {/* HERO */}

        <section className="admin-dashboard-hero conmat-page-hero workspace-hero">

          <div className="admin-dashboard-hero-content workspace-hero__content">

            <span className="admin-dashboard-kicker">
              Admin Workspace
            </span>

            <h1>
              Control the marketplace, verify sellers and monitor
              platform health.
            </h1>

            <p>
              Manage users, seller verification, marketplace activity
              and platform trust from one centralized workspace.
            </p>


          </div>


          {/* SLA CARD */}

          <aside className="admin-dashboard-hero-card workspace-hero__side">

            <div className="admin-dashboard-hero-card__top">

              <span>
                Verification SLA
              </span>

              <span className="admin-dashboard-live">
                <span />
                Active
              </span>

            </div>


            <div className="admin-dashboard-sla-icon">
              <Clock3 size={23} />
            </div>


            <strong>
              24h
            </strong>


            <p>
              Recommended maximum review time for seller applications.
            </p>


            <Link
              to="/admin/seller-verification"
              className="admin-dashboard-hero-link"
            >
              Review applications
              <ArrowRight size={15} />
            </Link>

          </aside>

          <div className="admin-dashboard-actions conmat-hero-actions">
            <Link
              to="/admin/users"
              className="admin-dashboard-actions__primary conmat-hero-action conmat-hero-action--primary"
            >
              <Users size={17} />
              User Management
            </Link>

            <Link
              to="/admin/seller-verification"
              className="admin-dashboard-actions__secondary conmat-hero-action conmat-hero-action--secondary"
            >
              <ShieldCheck size={17} />
              Seller Verification
            </Link>
          </div>

        </section>


        {/* NOTICE */}

        {notice && (
          <div className="admin-dashboard-notice">
            <CheckCircle2 size={17} />
            {notice}
          </div>
        )}


        {/* KPI CARD */}

        <section className="admin-dashboard-stats">

          {summary.kpis.map((item) => (
            <AdminStatCard
              key={item.id}
              {...item}
            />
          ))}

        </section>


        {/* ANALYTICS */}

        <section className="admin-dashboard-analytics">


          {/* PLATFORM ACTIVITY */}

          <div className="admin-dashboard-panel">

            <div className="admin-dashboard-panel__head">

              <div>

                <div className="admin-dashboard-section-label">
                  <Activity size={14} />
                  Platform Analytics
                </div>

                <h2>
                  Paid orders and revenue
                </h2>

              </div>

              <span className="admin-dashboard-period">
                Last 6 months
              </span>

            </div>

            <p className="dashboard-chart-description">
              Confirmed payments by month: bars show revenue and the line shows paid order count.
            </p>


            <div className="admin-dashboard-chart">
              {hasPlatformActivity ? (
                <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <ComposedChart
                  data={platformActivity}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 5,
                    bottom: 5
                  }}
                >

                  <CartesianGrid
                    stroke="#e5e7eb"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: '#64748b'
                    }}
                  />

                  <YAxis
                    yAxisId="revenue"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: '#64748b'
                    }}
                    tickFormatter={(value) => `PKR ${Math.round(value / 1000)}k`}
                  />

                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />

                  <Tooltip
                    formatter={(value, name) => [
                      name === 'Revenue' ? `PKR ${Number(value).toLocaleString('en-PK')}` : value,
                      name,
                    ]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 10px 24px rgba(15,23,42,.1)' }}
                  />

                  <Legend />

                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#fed7aa"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={46}
                  />

                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="paidOrders"
                    name="Paid orders"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{
                      r: 4
                    }}
                    activeDot={{
                      r: 6
                    }}
                  />

                </ComposedChart>

                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <strong>No confirmed payments yet</strong>
                  <span>Paid order count and revenue will appear here by month.</span>
                </div>
              )}

            </div>

          </div>


          {/* MARKETPLACE ACTIVITY */}

          <div className="admin-dashboard-panel">

            <div className="admin-dashboard-panel__head">

              <div>

                <div className="admin-dashboard-section-label">
                  <BarChart3 size={14} />
                  Marketplace
                </div>

                <h2>
                  Current platform totals
                </h2>

              </div>

            </div>

            <p className="dashboard-chart-description">
              Live totals across marketplace orders, verified sellers, users, and open bids.
            </p>


            <div className="admin-dashboard-chart">
              {hasMarketplaceActivity ? (
                <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={marketplaceReports}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 5,
                    bottom: 5
                  }}
                >

                  <CartesianGrid
                    stroke="#e5e7eb"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="type"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: '#64748b'
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: '#64748b'
                    }}
                  />

                  <Tooltip formatter={(value) => [value, 'Total']} cursor={{ fill: '#fff7ed' }} />

                  <Bar
                    dataKey="value"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />

                </BarChart>

                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <strong>No platform activity yet</strong>
                  <span>Orders, verified sellers, users, and bids will appear here.</span>
                </div>
              )}

            </div>

          </div>

        </section>


        {/* SELLER + AUDIT */}

        <section className="admin-dashboard-grid">


          {/* SELLER VERIFICATION */}

          <div className="admin-dashboard-panel">

            <div className="admin-dashboard-panel__head">

              <div>

                <div className="admin-dashboard-section-label">
                  <ShieldCheck size={14} />
                  Seller Verification
                </div>

                <h2>
                  Pending applications
                </h2>

              </div>

              <Link to="/admin/seller-verification">
                View all
                <ArrowRight size={14} />
              </Link>

            </div>


            <div className="admin-dashboard-seller-grid">

              {pendingSellers.length ? (

                pendingSellers.map((seller) => (

                  <SellerVerificationCard
                    key={seller.id}
                    seller={seller}
                    onApprove={approveSeller}
                    onReject={rejectSeller}
                  />

                ))

              ) : (

                <div className="admin-dashboard-empty">

                  <CheckCircle2 size={20} />

                  <span>
                    No pending applications right now.
                  </span>

                </div>

              )}

            </div>

          </div>


          {/* AUDIT LOG */}

          <aside className="admin-dashboard-panel">

            <div className="admin-dashboard-panel__head">

              <div>

                <div className="admin-dashboard-section-label">
                  <FileCheck size={14} />
                  Audit Logs
                </div>

                <h2>
                  Recent activity
                </h2>

              </div>

            </div>


            <div className="admin-audit-list">

              {summary.reports.map((report) => (

                <article key={report.id}>

                  <div className="admin-audit-icon">
                    <Activity size={15} />
                  </div>

                  <div>

                    <strong>
                      {report.label}
                    </strong>

                    <p>
                      {report.detail}
                    </p>

                    <span>
                      {report.value}
                    </span>

                  </div>

                </article>

              ))}

              {!summary.reports.length && <p>No live platform activity is available yet.</p>}

            </div>

          </aside>

        </section>


      </main>
    </>
  );
}
