import { Activity, ArrowUpRight, Clock3, Gavel, Package, ShoppingBag, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import './RecentActivityList.css';

const iconFor = {
  Account: UserRound,
  Product: Package,
  Order: ShoppingBag,
  Bid: Gavel,
};

const formatActivityDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function RecentActivityList({ activities = [], total = 0, hasMore = false, loadingMore = false, onLoadMore }) {
  return (
    <section className="recent-activity-list">
      <div className="recent-activity-list__head">
        <div>
          <span>Account timeline</span>
          <h3>Recent Activities</h3>
        </div>
        <strong>{total} activit{total === 1 ? 'y' : 'ies'}</strong>
      </div>

      {activities.map((activity) => {
        const Icon = iconFor[activity.type] || Activity;
        return (
          <article className="recent-activity-list__item" key={activity.id}>
            <div className="recent-activity-list__icon"><Icon /></div>
            <div className="recent-activity-list__content">
              <div className="recent-activity-list__meta">
                <span>{activity.type || 'Activity'}</span>
                <small><Clock3 size={13} /> {formatActivityDate(activity.occurredAt || activity.createdAt)}</small>
              </div>
              <h4>{activity.title}</h4>
              <p>{activity.description}</p>
            </div>
            {activity.actionUrl && (
              <Link to={activity.actionUrl} aria-label={`Open ${activity.title}`}>
                View <ArrowUpRight size={15} />
              </Link>
            )}
          </article>
        );
      })}

      {!activities.length && (
        <div className="recent-activity-list__empty">
          <Activity />
          <p>No recent activity has been recorded yet.</p>
        </div>
      )}

      {hasMore && (
        <button type="button" className="recent-activity-list__load-more" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </section>
  );
}
