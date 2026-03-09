import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

export default function HeaderNotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const handleClick = (n) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center relative"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[320px] max-h-[400px] overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200 z-50 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[340px]">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 px-3 py-6 text-center">No notifications</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.slice(0, 20).map((n) => (
                  <li key={n.id || `${n.title}-${n.createdAt}`}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 flex gap-2 ${!n.read ? 'bg-primary-50/50' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                        {n.message && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="shrink-0 rounded-full bg-primary-500 w-2 h-2 mt-1.5" title="Unread" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
