import { Bell, CheckCircle } from "lucide-react";
import './NotificationItem.css';

export default function NotificationItem({ notification, onMarkRead }) {
  const notificationDate = new Date(notification.createdAt || 0);
  const createdAt = Number.isNaN(notificationDate.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(notificationDate);

  const handleRead = () => {
    if (!notification.isRead) {
      onMarkRead?.(notification.id);
    }
  };

  return (
    <article className={`notification-item ${notification.isRead ? 'notification-item--read' : ''}`}>
      <div className="notification-item__icon"><Bell /></div>
      <div className="notification-item__content">
        <div className="notification-item__topline">
          <span>{notification.type}</span>
          <small>{createdAt}</small>
        </div>
        <h3>{notification.title}</h3>
        <p>{notification.message}</p>
      </div>
      <button
        type="button"
        className={`notification-item__read-btn ${notification.isRead ? 'notification-item__read-btn--read' : 'notification-item__read-btn--unread'}`}
        onClick={handleRead}
        disabled={notification.isRead}
        title={notification.isRead ? 'Already read' : 'Mark as read'}
        aria-label={notification.isRead ? 'Notification already read' : 'Mark notification as read'}
      >
        <CheckCircle size={16} />
        <span>Read</span>
      </button>
    </article>
  );
}
