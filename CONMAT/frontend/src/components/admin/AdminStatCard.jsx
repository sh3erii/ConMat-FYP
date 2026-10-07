import './AdminStatCard.css';

export default function AdminStatCard({ label, value, helper, trend }) {
  return (
    <article className="admin-stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
      {trend && <em>{trend}</em>}
    </article>
  );
}
