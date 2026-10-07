import { useEffect, useState } from 'react';
import RoleNavbar from '../../components/common/RoleNavbar';
import AdminStatCard from '../../components/admin/AdminStatCard';
import ReportGenerator from '../../components/reports/ReportGenerator';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import './AdminReports.css';

export default function AdminReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        const response = await adminService.getPlatformReports();
        if (active) setReports(response.reports || []);
      } catch {
        if (active) setReports([]);
      }
    }

    loadReports();
    return () => { active = false; };
  }, []);

  return (
    <>
      <RoleNavbar />
      <main className="admin-reports-page conmat-page-shell">
        <section className="admin-reports-hero conmat-page-hero">
        <span>Admin Reports</span>
        <h1>Platform analytics for orders, bidding, seller verification and risk alerts.</h1>
        </section>

      <section className="admin-reports-grid">
        {reports.map((item) => <AdminStatCard key={item.id} label={item.label} value={item.value} helper={item.detail} />)}
      </section>

      <ReportGenerator user={user} adminMode />

      <section className="admin-reports-panel">
        <div className="admin-reports-panel__head">
          <div>
            <span>Compliance Timeline</span>
            <h2>Recent platform events</h2>
          </div>
        </div>
        <div className="admin-reports-timeline">
          {reports.map((report) => (
            <article key={report.id}>
              <div />
              <section>
                <strong>{report.label}</strong>
                <p>{report.detail}</p>
                <span>{report.value}</span>
              </section>
            </article>
          ))}
          {!reports.length && <p>No report data is available yet.</p>}
        </div>
      </section>
    </main>
    </>
  );
}
