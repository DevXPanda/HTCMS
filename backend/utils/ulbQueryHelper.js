import { Op } from 'sequelize';

/**
 * ULB Query Helper Utilities
 * Provides reusable functions to inject ULB filtering into Sequelize queries
 * 
 * Usage Examples:
 * 
 * // Basic usage - direct table with ulb_id column
 * const where = injectUlbFilter({ status: 'active' }, req);
 * const items = await Model.findAll({ where });
 * 
 * // Via relation - when ulb_id is in a related table
 * const where = injectUlbFilterViaRelation(
 *   { status: 'active' },
 *   req,
 *   '$ward.ulb_id$'
 * );
 * const items = await Model.findAll({
 *   where,
 *   include: [{ model: Ward, as: 'ward' }]
 * });
 * 
 * // Multiple relations
 * const where = injectUlbFilterViaRelation(
 *   { status: 'active' },
 *   req,
 *   '$property.ward.ulb_id$'
 * );
 */

/**
 * Injects WHERE ulb_id = req.user.ulb_id into Sequelize where clauses
 * 
 * @param {Object} whereClause - Existing Sequelize where clause
 * @param {Object} req - Express request object (must have req.user.ulb_id)
 * @returns {Object} - Updated where clause with ulb_id filter
 * 
 * @example
 * const where = injectUlbFilter({ status: 'active' }, req);
 * const workers = await Worker.findAll({ where });
 */
export const injectUlbFilter = (whereClause = {}, req) => {
  // Skip filtering for admin users
  if (req.user && req.user.role === 'admin') {
    return whereClause;
  }

  // Get ulb_id from user (from JWT token or database)
  const ulbId = req.user?.ulb_id || req.user?.dataValues?.ulb_id || req.ulbFilter?.ulb_id;

  if (!ulbId) {
    // For non-admin users without ulb_id, return empty result filter
    // This prevents data leakage - returns no results instead of all data
    return {
      ...whereClause,
      id: { [Op.in]: [] } // Empty array ensures no results
    };
  }

  // Add ulb_id filter to where clause
  return {
    ...whereClause,
    ulb_id: ulbId
  };
};

/**
 * Injects ulb_id filter through relationships
 * Useful when the table doesn't have ulb_id directly but a related table does
 * 
 * @param {Object} whereClause - Existing Sequelize where clause
 * @param {Object} req - Express request object
 * @param {string} relationPath - Path to related table (e.g., '$ward.ulb_id$', '$property.ward.ulb_id$')
 * @returns {Object} - Updated where clause with ulb_id filter via relation
 * 
 * @example
 * // Filter demands by ULB through property -> ward relationship
 * const where = injectUlbFilterViaRelation(
 *   { status: 'pending' },
 *   req,
 *   '$property.ward.ulb_id$'
 * );
 * const demands = await Demand.findAll({
 *   where,
 *   include: [
 *     {
 *       model: Property,
 *       as: 'property',
 *       include: [{ model: Ward, as: 'ward' }]
 *     }
 *   ]
 * });
 */
export const injectUlbFilterViaRelation = (whereClause = {}, req, relationPath) => {
  // Skip filtering for admin users
  if (req.user && req.user.role === 'admin') {
    return whereClause;
  }

  // Get ulb_id from user
  const ulbId = req.user?.ulb_id || req.user?.dataValues?.ulb_id || req.ulbFilter?.ulb_id;

  if (!ulbId) {
    // For non-admin users without ulb_id, return empty result filter
    return {
      ...whereClause,
      id: { [Op.in]: [] }
    };
  }

  // Add ulb_id filter via relation path
  const relationFilter = {
    [relationPath]: ulbId
  };

  // Merge with existing where clause
  if (Object.keys(whereClause).length === 0) {
    return relationFilter;
  }

  // If where clause has Op.and, add to it
  if (whereClause[Op.and]) {
    return {
      ...whereClause,
      [Op.and]: [...whereClause[Op.and], relationFilter]
    };
  }

  // If where clause has Op.or, wrap both in Op.and
  if (whereClause[Op.or]) {
    return {
      [Op.and]: [
        whereClause,
        relationFilter
      ]
    };
  }

  // Otherwise, wrap in Op.and
  return {
    [Op.and]: [
      whereClause,
      relationFilter
    ]
  };
};

/**
 * Combines multiple ULB filters (for complex queries)
 * 
 * @param {Object} whereClause - Existing Sequelize where clause
 * @param {Object} req - Express request object
 * @param {Array<string>} relationPaths - Array of relation paths to filter by
 * @returns {Object} - Updated where clause with multiple ULB filters
 * 
 * @example
 * // Filter by ULB through multiple paths (OR condition)
 * const where = injectMultipleUlbFilters(
 *   { status: 'active' },
 *   req,
 *   ['$ward.ulb_id$', '$property.ward.ulb_id$']
 * );
 */
export const injectMultipleUlbFilters = (whereClause = {}, req, relationPaths = []) => {
  // Skip filtering for admin users
  if (req.user && req.user.role === 'admin') {
    return whereClause;
  }

  // Get ulb_id from user
  const ulbId = req.user?.ulb_id || req.user?.dataValues?.ulb_id || req.ulbFilter?.ulb_id;

  if (!ulbId) {
    return {
      ...whereClause,
      id: { [Op.in]: [] }
    };
  }

  // Build filters for each relation path
  const relationFilters = relationPaths.map(path => ({
    [path]: ulbId
  }));

  // Combine with OR if multiple paths, otherwise use single filter
  const ulbFilter = relationPaths.length > 1
    ? { [Op.or]: relationFilters }
    : relationFilters[0];

  // Merge with existing where clause
  if (Object.keys(whereClause).length === 0) {
    return ulbFilter;
  }

  if (whereClause[Op.and]) {
    return {
      ...whereClause,
      [Op.and]: [...whereClause[Op.and], ulbFilter]
    };
  }

  return {
    [Op.and]: [
      whereClause,
      ulbFilter
    ]
  };
};
