import './AdminStatCard.css';

export default function AdminStatCard({ label, value, helper }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-card__head">
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}
