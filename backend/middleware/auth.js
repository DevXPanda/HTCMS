import jwt from 'jsonwebtoken';
import { User, AdminManagement } from '../models/index.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = null;

    // Check userType from JWT token to determine which table to search first
    // This prevents ID collisions between User and AdminManagement tables
    if (decoded.userType === 'admin_management') {
      // Staff user - check admin_management table first
      user = await AdminManagement.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });
      if (user) req.userType = 'admin_management';
    } else {
      // Regular user or unspecified - check users table first
      user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });
      if (user) {
        req.userType = 'user';
      } else {
        user = await AdminManagement.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] }
        });
        if (user) req.userType = 'admin_management';
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Attach user to request (user has role, ulb_id from DB)
    req.user = user;

    // SBM read-only: block non-GET when full_crud_enabled is false
    const roleUpper = (req.user.role || '').toString().toUpperCase();
    if (req.userType === 'admin_management' && roleUpper === 'SBM') {
      const fullCrud = Boolean(req.user.full_crud_enabled);
      if (!fullCrud && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return res.status(403).json({
          message: 'SBM role has read-only access. Full CRUD is disabled for your account.'
        });
      }
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Alias for authenticate function for consistency
export const authenticateToken = authenticate;

/**
 * Role-based Authorization Middleware
 * Checks if user has required role(s)
 * @param {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = (req.user.role || '').toString();
    const normalizedRoles = roles.map((r) => (r || '').toString().toUpperCase());
    if (!normalizedRoles.includes(userRole.toUpperCase())) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Single Role Authorization Middleware
 * Checks if user has specific role
 * @param {string} role - Required role
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = (req.user.role || '').toString().toUpperCase();
    const requiredRole = (role || '').toString().toUpperCase();
    if (userRole !== requiredRole) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};
