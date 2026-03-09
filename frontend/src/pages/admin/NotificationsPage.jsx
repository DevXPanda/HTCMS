import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = (n) => {
    if (n.id && !n.read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary-600" />
            All Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Payments, requests, and updates from collector, citizen, and other roles
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner spinner-md" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1">New payments, requests, and updates will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((n) => (
              <li key={n.id || `${n.title}-${n.createdAt}`}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 flex items-start gap-3 transition-colors ${!n.read ? 'bg-primary-50/40' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{n.title}</p>
                    {n.message && <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && (
                      <span className="rounded-full bg-primary-500 w-2.5 h-2.5" title="Unread" />
                    )}
                    {n.link && <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
