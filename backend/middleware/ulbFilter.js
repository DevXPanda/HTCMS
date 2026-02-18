import { Op } from 'sequelize';

/**
 * ULB Filtering Middleware
 * Automatically filters all queries by ulb_id for non-admin users
 * Prevents cross-ULB data access
 * 
 * Usage: Add this middleware after authenticate middleware
 * router.use(authenticate);
 * router.use(ulbFilter); // Add this for automatic ULB filtering
 */
export const ulbFilter = async (req, res, next) => {
  try {
    // Skip ULB filtering for admin users (they can access all ULBs)
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // Extract ulb_id from user (from JWT token or database)
    const ulbId = req.user?.ulb_id || req.user?.dataValues?.ulb_id;

    // If user has ulb_id, add it to request for use in controllers
    if (ulbId) {
      req.ulbFilter = {
        ulb_id: ulbId
      };
    } else {
      // For non-admin users without ulb_id, deny access
      // This ensures all non-admin users must have an assigned ULB
      if (req.user && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. User must be assigned to an ULB.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('ULB filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during ULB filtering'
    });
  }
};

// Re-export query helpers from utils for convenience
export { injectUlbFilter, injectUlbFilterViaRelation, injectMultipleUlbFilters } from '../utils/ulbQueryHelper.js';
