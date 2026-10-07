import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../../components/common/RoleNavbar';
import NotificationItem from '../../components/notification/NotificationItem';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notificationService';
import './NotificationsPage.css';

const PAGE_SIZE = 5;
const filters = ['All', 'Unread', 'Order', 'Bid', 'Payment', 'Invoice', 'Verification', 'Report', 'Account', 'System'];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All');
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return undefined;
    }

    let isMounted = true;

    getMyNotifications({ limit: PAGE_SIZE, offset: 0, filter })
      .then((page) => {
        if (!isMounted) return;
        setNotifications(page.notifications);
        setUnreadCount(page.unread);
        setNextOffset(page.nextOffset);
        setHasMore(page.hasMore);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.response?.data?.message || 'Unable to load notifications.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [user, navigate, filter]);

  const handleFilterChange = (nextFilter) => {
    if (nextFilter === filter) return;
    setLoading(true);
    setError('');
    setNotifications([]);
    setFilter(nextFilter);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const page = await getMyNotifications({ limit: PAGE_SIZE, offset: nextOffset, filter });
      setNotifications((current) => [
        ...current,
        ...page.notifications.filter((next) => !current.some((item) => item.id === next.id)),
      ]);
      setUnreadCount(page.unread);
      setNextOffset(page.nextOffset);
      setHasMore(page.hasMore);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkRead = async (id) => {
    const target = notifications.find((item) => item.id === id);
    if (!target || target.isRead) return;
    setError('');
    try {
      await markNotificationRead(id);
      setUnreadCount((count) => Math.max(0, count - 1));
      setNotifications((current) => (
        filter === 'Unread'
          ? current.filter((item) => item.id !== id)
          : current.map((item) => (item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item))
      ));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to mark this notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) return;
    setMarkingAllRead(true);
    setError('');
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      if (filter === 'Unread') {
        setNotifications([]);
        setNextOffset(0);
        setHasMore(false);
      } else {
        const readAt = new Date().toISOString();
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || readAt })));
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to mark all notifications as read.');
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <>
      <RoleNavbar />
      <main className="notifications-page conmat-page-shell">
        <section className="notifications-page__hero conmat-page-hero position-relative">
          <div>
            <p>Alerts Center</p>
            <h1>Notifications</h1>
            <span>{unreadCount} unread update{unreadCount === 1 ? '' : 's'} from orders, bids, invoices and admin actions.</span>
          </div>
        </section>

        <div className="notifications-page__controls">
          <button
            type="button"
            className="notifications-page__read-all"
            onClick={handleMarkAllRead}
            disabled={loading || markingAllRead || unreadCount === 0}
          >
            {markingAllRead ? 'Marking...' : 'Mark all as read'}
          </button>

          <label className="notifications-page__filters">
            <select
              className="conmat-filter-select"
              aria-label="Filter notifications"
              value={filter}
              onChange={(event) => handleFilterChange(event.target.value)}
            >
              {filters.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <section className="notifications-page__list" aria-live="polite">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onMarkRead={handleMarkRead} />
          ))}

          {loading && <div className="notifications-page__state">Loading notifications...</div>}

          {!loading && !notifications.length && !error && (
            <div className="notifications-page__empty">
              <h3>No notifications found</h3>
              <p>New order, bid, invoice and account alerts will appear here.</p>
            </div>
          )}

          {error && <div className="notifications-page__error">{error}</div>}

          {!loading && hasMore && (
            <button type="button" className="notifications-page__load-more" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </section>
      </main>
    </>
  );
}
