import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../models/index.js';
import { AdminManagement } from '../models/AdminManagement.js';

/**
 * Enhanced Authentication Middleware
 * Verifies JWT token and attaches user to request object
 * Checks both users table and admin_management table for authentication
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid token format. Expected: Bearer <token>' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token missing from Authorization header' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = null;
    let userType = null;

    // Check userType from JWT token to determine which table to search first
    if (decoded.userType === 'admin_management') {
      // Staff user - check admin_management table first
      user = await AdminManagement.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (user) {
        userType = 'admin_management';
        // Add role field for compatibility with existing authorization middleware
        user.dataValues.role = user.role;

        // Copy ward_ids from JWT token to user object for clerks and inspectors
        if ((user.role === 'clerk' || user.role === 'inspector') && decoded.ward_ids) {
          user.dataValues.ward_ids = decoded.ward_ids;
        }
      } else {
        // Fallback to regular users table if not found in admin_management
        user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] }
        });

        if (user) {
          userType = 'user';
        }
      }
    } else {
      // Regular user or unspecified - check users table first (original logic)
      user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (user) {
        userType = 'user';
      } else {
        // Fallback to admin_management table if not found in users
        user = await AdminManagement.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] }
        });

        if (user) {
          userType = 'admin_management';
          // Add role field for compatibility with existing authorization middleware
          user.dataValues.role = user.role;

          // Copy ward_ids from JWT token to user object for clerks and inspectors
          if ((user.role === 'clerk' || user.role === 'inspector') && decoded.ward_ids) {
            user.dataValues.ward_ids = decoded.ward_ids;
          }
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        message: 'Invalid token: User not found or account deleted',
        error: 'USER_NOT_FOUND'
      });
    }

    // Attach user and user type to request
    req.user = user;
    req.userType = userType;

    // Also attach userType to user object for easy access in controllers
    user.userType = userType;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token: Malformed or tampered token',
        error: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired: Please login again',
        error: 'TOKEN_EXPIRED'
      });
    }
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        message: 'Token not active: Token is not yet valid',
        error: 'TOKEN_NOT_ACTIVE'
      });
    }
    res.status(500).json({
      message: 'Server error during authentication',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Employee Authentication Middleware
 * Specifically for admin_management table authentication
 */
export const authenticateEmployee = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only check admin_management table
    const employee = await AdminManagement.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!employee) {
      return res.status(401).json({ message: 'Token is not valid for employee access' });
    }

    // Check if employee is active
    if (employee.status !== 'active') {
      return res.status(401).json({ message: 'Employee account is inactive' });
    }

    // Attach employee to request
    req.user = employee;
    req.userType = 'admin_management';
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

/**
 * Ward-based Access Control Middleware
 * Enforces role-based ward access rules
 */
export const requireWardAccess = (req, res, next) => {
  try {
    // Admin has full access to all wards
    if (req.userType === 'user' && req.user.role === 'admin') {
      return next();
    }

    // Collector can access ALL wards
    if (req.userType === 'admin_management' && req.user.role === 'collector') {
      return next();
    }

    // Officer can access ALL wards (supervisory role)
    if (req.userType === 'admin_management' && req.user.role === 'officer') {
      // Officers should also get ward filter for consistency
      if (req.user.ward_ids && req.user.ward_ids.length > 0) {
        req.wardFilter = {
          id: {
            [Op.in]: req.user.ward_ids
          }
        };
      }
      return next();
    }

    // Clerk can access ONLY assigned wards
    if (req.userType === 'admin_management' && req.user.role === 'clerk') {
      if (!req.user.ward_ids || req.user.ward_ids.length === 0) {
        return res.status(403).json({
          message: 'Access denied. No wards assigned to clerk.'
        });
      }
      // Add ward filter to request for use in controllers
      req.wardFilter = {
        id: {
          [Op.in]: req.user.ward_ids
        }
      };
      return next();
    }

    // Inspector can access ONLY assigned wards
    if (req.userType === 'admin_management' && req.user.role === 'inspector') {
      if (!req.user.ward_ids || req.user.ward_ids.length === 0) {
        return res.status(403).json({
          message: 'Access denied. No wards assigned to inspector.'
        });
      }
      // Add ward filter to request for use in controllers
      req.wardFilter = {
        id: {
          [Op.in]: req.user.ward_ids
        }
      };
      return next();
    }

    // Citizens have their own property-based access (not ward-based)
    if (req.userType === 'user' && req.user.role === 'citizen') {
      return next();
    }

    // If no specific access rules match, deny access
    return res.status(403).json({
      message: 'Access denied. Invalid role or insufficient permissions.'
    });
  } catch (error) {
    console.error('Ward access check error:', error);
    res.status(500).json({ message: 'Server error during ward access check' });
  }
};

/**
 * Validates if user has access to specific ward
 * @param {number} wardId - Ward ID to check access for
 * @returns {boolean} - True if user has access, false otherwise
 */
export const validateWardAccess = (user, userType, wardId) => {
  // Admin has full access to all wards
  if (userType === 'user' && user.role === 'admin') {
    return true;
  }

  // Collector can access ALL wards
  if (userType === 'admin_management' && user.role === 'collector') {
    return true;
  }

  // Officer can access ALL wards
  if (userType === 'admin_management' && user.role === 'officer') {
    return true;
  }

  // Clerk can access ONLY assigned wards
  if (userType === 'admin_management' && user.role === 'clerk') {
    if (!user.ward_ids || user.ward_ids.length === 0) {
      return false;
    }
    return user.ward_ids.includes(wardId);
  }

  // Inspector can access ONLY assigned wards
  if (userType === 'admin_management' && user.role === 'inspector') {
    if (!user.ward_ids || user.ward_ids.length === 0) {
      return false;
    }
    return user.ward_ids.includes(wardId);
  }

  // Citizens don't use ward-based access
  if (userType === 'user' && user.role === 'citizen') {
    return false; // Citizens use property-based access, not ward-based
  }

  return false;
};

/**
 * Middleware to validate access to specific ward in request parameters
 * @param {string} param - Request parameter name containing ward ID (default: 'wardId')
 */
export const requireSpecificWardAccess = (param = 'wardId') => {
  return (req, res, next) => {
    try {
      const wardId = parseInt(req.params[param] || req.body[param] || req.query[param]);

      if (!wardId || isNaN(wardId)) {
        return res.status(400).json({
          message: 'Valid ward ID is required'
        });
      }

      const hasAccess = validateWardAccess(req.user, req.userType, wardId);

      if (!hasAccess) {
        return res.status(403).json({
          message: 'Access denied. You do not have access to this ward.'
        });
      }

      next();
    } catch (error) {
      console.error('Specific ward access check error:', error);
      res.status(500).json({ message: 'Server error during ward access validation' });
    }
  };
};
export const requirePasswordChange = (req, res, next) => {
  // DISABLED: Staff no longer required to change password on first login
  // Admin-set passwords are now treated as final
  next();
};

// Alias for authenticate function for consistency
export const authenticateToken = authenticate;

/**
 * Role-based Authorization Middleware (Enhanced)
 * Checks if user has required role(s) from both tables
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
 * Single Role Authorization Middleware (Enhanced)
 * Checks if user has specific role from both tables
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

/**
 * Admin-only Authorization
 * Only allows admin role from users table (not admin_management)
 */
export const requireAdmin = async (req, res, next) => {
  // First authenticate the user to set req.user
  try {
    await authenticate(req, res, () => { }); // Authenticate but don't call next yet
  } catch (error) {
    // If authentication fails, the error is already handled by authenticate middleware
    return;
  }

  // Check if user exists after authentication
  if (!req.user) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Check if user has admin role from users table
  if (req.userType !== 'user' || req.user.role !== 'admin') {
    if (req.userType !== 'user') {
      return res.status(403).json({
        message: 'Insufficient role: Staff authentication detected. Admin authentication required.'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: `Insufficient role: User role '${req.user.role}' is not authorized. Admin role required.`
      });
    }

    return res.status(403).json({
      message: 'Insufficient role: Admin access required.'
    });
  }

  next();
};
