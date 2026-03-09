import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AdminManagement } from '../models/AdminManagement.js';

/**
 * Attach notification Socket.IO handlers.
 * Auth: client sends { auth: { token: 'Bearer <jwt>' } } in handshake.
 * Server verifies JWT and joins socket to user + role rooms for targeted pushes.
 * @param {import('socket.io').Server} io
 */
export function attachNotificationSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const cleanToken = typeof token === 'string' && token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      const userId = decoded.userId;
      const userType = decoded.userType || 'user';
      let role = decoded.role;

      if (!role && userType === 'admin_management') {
        const staff = await AdminManagement.findByPk(userId, { attributes: ['role'] });
        role = staff?.role ? String(staff.role).toLowerCase() : 'staff';
      }
      if (!role && userType === 'user') {
        const user = await User.findByPk(userId, { attributes: ['role'] });
        role = user?.role ? String(user.role).toLowerCase() : 'citizen';
      }

      socket.userId = userId;
      socket.userType = userType;
      socket.role = role || 'user';
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const roomUser = `user:${socket.userType}:${socket.userId}`;
    const roomRole = `role:${socket.role}`;
    socket.join(roomUser);
    socket.join(roomRole);

    socket.on('disconnect', () => {});
  });
}

/**
 * Get room name for a specific user (for targeted notifications).
 * @param {string} userType - 'user' | 'admin_management'
 * @param {number} userId
 */
export function getUserRoom(userType, userId) {
  return `user:${userType}:${userId}`;
}

/**
 * Get room name for a role (broadcast to all users with that role).
 * @param {string} role - admin, collector, citizen, clerk, etc.
 */
export function getRoleRoom(role) {
  return `role:${String(role).toLowerCase()}`;
}
