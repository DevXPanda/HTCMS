import { Notification } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * GET /api/notifications - List notifications for current user (role-wise).
 * Uses req.user (User or AdminManagement) and req.userType from auth middleware.
 */
export const getMyNotifications = async (req, res) => {
  try {
    const user = req.user;
    const userType = req.userType || 'user';
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { limit = 50, offset = 0, unreadOnly } = req.query;
    const where = { userId, userType };
    if (unreadOnly === 'true' || unreadOnly === '1') {
      where.read = false;
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 100),
      offset: Math.max(0, parseInt(offset, 10))
    });

    const notifications = rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt
    }));

    return res.json({
      success: true,
      data: {
        notifications,
        total: count,
        unreadCount: await Notification.count({ where: { userId, userType, read: false } })
      }
    });
  } catch (err) {
    console.error('getMyNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

/**
 * PATCH /api/notifications/:id/read - Mark one as read.
 */
export const markAsRead = async (req, res) => {
  try {
    const user = req.user;
    const userType = req.userType || 'user';
    const userId = user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const n = await Notification.findOne({
      where: { id: req.params.id, userId, userType }
    });
    if (!n) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await n.update({ read: true });
    return res.json({ success: true, data: { id: n.id, read: true } });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

/**
 * PATCH /api/notifications/read-all - Mark all as read for current user.
 */
export const markAllAsRead = async (req, res) => {
  try {
    const user = req.user;
    const userType = req.userType || 'user';
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    await Notification.update(
      { read: true },
      { where: { userId, userType, read: false } }
    );
    return res.json({ success: true, message: 'All marked as read' });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};
