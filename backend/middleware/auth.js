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

    // Try to find user in User table first (for admin/citizen users)
    let user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    // If not found in User table, try AdminManagement table (for staff users)
    if (!user) {
      user = await AdminManagement.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Attach user to request
    req.user = user;
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

    if (!roles.includes(req.user.role)) {
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

    if (req.user.role !== role) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};
