import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, notificationsAPI } from '../services/api';

const NotificationContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) return { notifications: [], unreadCount: 0, fetchNotifications: () => {}, markAsRead: () => {}, markAllAsRead: () => {} };
  return ctx;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const token = typeof window !== 'undefined' ? (localStorage.getItem('staffToken') || localStorage.getItem('token')) : null;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await notificationsAPI.getList({ limit: 50 });
      const data = res.data?.data || res.data;
      const list = data?.notifications || [];
      const unread = data?.unreadCount ?? list.filter((n) => !n.read).length;
      setNotifications(list);
      setUnreadCount(unread);
    } catch (_) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  // Connect Socket.IO when token is present (any role)
  useEffect(() => {
    if (!token || !API_BASE_URL) return;

    let cancelled = false;
    const socket = io(API_BASE_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    socketRef.current = socket;

    socket.on('notification', (payload) => {
      if (cancelled) return;
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === payload.id || (n.title === payload.title && n.createdAt === payload.createdAt));
        if (exists) return prev;
        return [{ ...payload, read: false }, ...prev];
      });
      setUnreadCount((c) => c + 1);
    });

    socket.on('connect_error', () => {});
    socket.on('disconnect', () => {});

    return () => {
      cancelled = true;
      socketRef.current = null;
      const s = socket;
      s.removeAllListeners();
      // Defer disconnect to avoid "WebSocket closed before connection established" (React Strict Mode / rapid unmount)
      setTimeout(() => {
        try {
          if (s.connected) s.disconnect();
        } catch (_) {}
      }, 150);
    };
  }, [token]);

  // Initial fetch when token exists
  useEffect(() => {
    if (token) fetchNotifications();
  }, [token, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
