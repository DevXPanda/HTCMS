import { Notification } from '../models/index.js';
import { User } from '../models/User.js';
import { getUserRoom, getRoleRoom } from '../socket/notificationSocket.js';

let ioInstance = null;

export function setNotificationIO(io) {
  ioInstance = io;
}

export function getNotificationIO() {
  return ioInstance;
}

/**
 * Create a notification and emit to the user in real time.
 * @param {Object} opts
 * @param {number} opts.userId - User.id or AdminManagement.id
 * @param {string} opts.userType - 'user' | 'admin_management'
 * @param {string} [opts.role] - role for role-based broadcast
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {string} [opts.link]
 */
export async function pushNotification({ userId, userType, role, title, message, link }) {
  const normalizedRole = role ? String(role).toLowerCase() : null;
  const record = await Notification.create({
    userId,
    userType: userType || 'user',
    role: normalizedRole,
    title,
    message: message || null,
    link: link || null,
    read: false
  });

  const payload = {
    id: record.id,
    title: record.title,
    message: record.message,
    link: record.link,
    read: record.read,
    createdAt: record.createdAt
  };

  const io = getNotificationIO();
  if (io) {
    const userRoom = getUserRoom(userType || 'user', userId);
    io.to(userRoom).emit('notification', payload);
  }

  return record;
}

/**
 * Push to all users with a given role (e.g. admin, collector).
 * Broadcast-only (no DB). For persisted admin notifications use pushToAdmins.
 */
export async function pushToRole(role, { title, message, link }) {
  const io = getNotificationIO();
  const payload = {
    id: null,
    title,
    message,
    link,
    read: false,
    createdAt: new Date().toISOString()
  };
  if (io) {
    io.to(getRoleRoom(role)).emit('notification', payload);
  }
  return payload;
}

/**
 * Notify all admin users (User.role = 'admin'). Creates a persisted Notification per admin
 * and emits to role:admin so super admin / admin see it in real time and in list.
 */
export async function pushToAdmins({ title, message, link }) {
  try {
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id']
    });
    const io = getNotificationIO();
    const roleRoom = getRoleRoom('admin');

    for (const a of admins) {
      const record = await Notification.create({
        userId: a.id,
        userType: 'user',
        role: 'admin',
        title,
        message: message || null,
        link: link || null,
        read: false
      });
      const payload = {
        id: record.id,
        title: record.title,
        message: record.message,
        link: record.link,
        read: record.read,
        createdAt: record.createdAt
      };
      if (io) io.to(getUserRoom('user', a.id)).emit('notification', payload);
    }
    if (io && admins.length === 0) {
      io.to(roleRoom).emit('notification', {
        id: null,
        title,
        message,
        link,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('pushToAdmins error:', err);
  }
}
