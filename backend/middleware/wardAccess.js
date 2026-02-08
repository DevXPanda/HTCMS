import { Ward } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Middleware to ensure users can only access data from their assigned wards
 * This prevents data leaks between different roles and wards
 */
export const wardAccessControl = async (req, res, next) => {
  try {
    // Skip ward access control for admin users (they can access all wards)
    if (req.user.role === 'admin') {
      return next();
    }

    // Skip for roles that don't require ward assignments
    const rolesRequiringWards = ['collector', 'clerk', 'inspector', 'officer'];
    if (!rolesRequiringWards.includes(req.user.role)) {
      return next();
    }

    let assignedWardIds = [];

    // For clerks, inspectors, and officers, use ward_ids from JWT token if available
    if ((req.user.role === 'clerk' || req.user.role === 'inspector' || req.user.role === 'officer') && req.user.ward_ids && Array.isArray(req.user.ward_ids)) {
      assignedWardIds = req.user.ward_ids;
    } else {
      // For other roles (collector), use database lookup
      const roleFieldMap = {
        'collector': 'collectorId',
        'clerk': 'clerkId',
        'inspector': 'inspectorId',
        'officer': 'officerId'
      };

      const fieldToCheck = roleFieldMap[req.user.role];

      // Only do database lookup for roles that need it
      if (fieldToCheck) {
        // Find wards assigned to this user
        const assignedWards = await Ward.findAll({
          where: {
            [fieldToCheck]: req.user.id,
            isActive: true
          },
          attributes: ['id', 'wardNumber', 'wardName']
        });

        assignedWardIds = assignedWards.map(ward => ward.id);
      }
    }

    if (assignedWardIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No wards assigned to this user. Please contact administrator.'
      });
    }

    // Add ward filter to request for use in controllers
    req.wardFilter = {
      id: { [Op.in]: assignedWardIds }
    };

    // For clerks, inspectors, and officers, we don't need to fetch ward details since they're in JWT
    // For other roles, we might want the ward details for reference
    if (req.user.role !== 'clerk' && req.user.role !== 'inspector' && req.user.role !== 'officer') {
      const assignedWards = await Ward.findAll({
        where: {
          id: { [Op.in]: assignedWardIds },
          isActive: true
        },
        attributes: ['id', 'wardNumber', 'wardName']
      });
      req.assignedWards = assignedWards;
    }

    next();
  } catch (error) {
    console.error('Ward access control error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during ward access validation'
    });
  }
};

/**
 * Middleware to check if user has access to a specific ward
 */
export const specificWardAccess = (wardIdParam = 'wardId') => {
  return async (req, res, next) => {
    try {
      // Skip for admin users
      if (req.user.role === 'admin') {
        return next();
      }

      // Get the ward ID from request parameters
      const wardId = req.params[wardIdParam] || req.body[wardIdParam] || req.query[wardIdParam];

      if (!wardId) {
        return res.status(400).json({
          success: false,
          message: 'Ward ID is required'
        });
      }

      // Get the field name for this role
      const roleFieldMap = {
        'collector': 'collectorId',
        'clerk': 'clerkid',
        'inspector': 'inspectorid',
        'officer': 'officerid'
      };

      const fieldToCheck = roleFieldMap[req.user.role];

      // Check if this ward is assigned to the user
      const ward = await Ward.findOne({
        where: {
          id: wardId,
          [fieldToCheck]: req.user.id,
          isActive: true
        }
      });

      if (!ward) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have access to this ward.'
        });
      }

      next();
    } catch (error) {
      console.error('Specific ward access error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during ward access validation'
      });
    }
  };
};
