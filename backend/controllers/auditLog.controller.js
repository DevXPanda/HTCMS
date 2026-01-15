import { AuditLog, User, Property, Ward } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @route   GET /api/audit-logs
 * @desc    Get audit logs with role-based filtering
 * @access  Private
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      actorUserId,
      actorRole,
      actionType,
      entityType,
      entityId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    const user = req.user;

    // Role-based filtering
    if (user.role === 'citizen') {
      // Citizens can only see their own actions and actions on their entities
      const userProperties = await Property.findAll({
        where: { ownerId: user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);

      // Get demands, payments, notices related to user's properties
      const { Demand, Payment, Notice } = await import('../models/index.js');
      
      const userDemands = await Demand.findAll({
        where: { propertyId: { [Op.in]: propertyIds } },
        attributes: ['id']
      });
      const demandIds = userDemands.map(d => d.id);

      const userPayments = await Payment.findAll({
        where: { propertyId: { [Op.in]: propertyIds } },
        attributes: ['id']
      });
      const paymentIds = userPayments.map(p => p.id);

      const userNotices = await Notice.findAll({
        where: { ownerId: user.id },
        attributes: ['id']
      });
      const noticeIds = userNotices.map(n => n.id);

      // Filter: actor is user OR entity is related to user
      where[Op.or] = [
        { actorUserId: user.id },
        {
          [Op.and]: [
            { entityType: 'Property', entityId: { [Op.in]: propertyIds } }
          ]
        },
        {
          [Op.and]: [
            { entityType: 'Demand', entityId: { [Op.in]: demandIds } }
          ]
        },
        {
          [Op.and]: [
            { entityType: 'Payment', entityId: { [Op.in]: paymentIds } }
          ]
        },
        {
          [Op.and]: [
            { entityType: 'Notice', entityId: { [Op.in]: noticeIds } }
          ]
        }
      ];
    } else if (user.role === 'collector') {
      // Collectors can only see logs related to their assigned wards
      const assignedWards = await Ward.findAll({
        where: { collectorId: user.id },
        attributes: ['id']
      });
      const wardIds = assignedWards.map(w => w.id);

      const wardProperties = await Property.findAll({
        where: { wardId: { [Op.in]: wardIds } },
        attributes: ['id']
      });
      const propertyIds = wardProperties.map(p => p.id);

      const { Demand, Payment, Notice } = await import('../models/index.js');
      
      const wardDemands = await Demand.findAll({
        where: { propertyId: { [Op.in]: propertyIds } },
        attributes: ['id']
      });
      const demandIds = wardDemands.map(d => d.id);

      const wardPayments = await Payment.findAll({
        where: { propertyId: { [Op.in]: propertyIds } },
        attributes: ['id']
      });
      const paymentIds = wardPayments.map(p => p.id);

      const wardNotices = await Notice.findAll({
        where: { propertyId: { [Op.in]: propertyIds } },
        attributes: ['id']
      });
      const noticeIds = wardNotices.map(n => n.id);

      where[Op.or] = [
        { actorUserId: user.id },
        {
          [Op.and]: [
            { entityType: 'Ward', entityId: { [Op.in]: wardIds } }
          ]
        },
        {
          [Op.and]: [
            { entityType: 'Property', entityId: { [Op.in]: propertyIds } }
          ]
        },
        {
          [Op.and]: [
            { entityType: 'Demand', entityId: { [Op.in]: demandIds } }
          ]
        },
        {
          [Op.and]: [
            { entityType: 'Payment', entityId: { [Op.in]: paymentIds } }
          ]
        },
        {
          [Op.and]: [
            { entityType: 'Notice', entityId: { [Op.in]: noticeIds } }
          ]
        }
      ];
    }
    // Admin and Assessor can see all logs (no additional filtering)

    // Apply filters
    if (actorUserId) where.actorUserId = actorUserId;
    if (actorRole) where.actorRole = actorRole;
    if (actionType) where.actionType = actionType;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    // Date range filter
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp[Op.gte] = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.timestamp[Op.lte] = endDate;
      }
    }

    // Search filter (description or metadata)
    if (search) {
      where[Op.or] = [
        ...(where[Op.or] || []),
        { description: { [Op.iLike]: `%${search}%` } },
        { metadata: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortOrders = ['ASC', 'DESC'];
    const order = [[sortBy, validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC']];

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      limit: parseInt(limit),
      offset,
      order
    });

    res.json({
      success: true,
      data: {
        auditLogs: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get audit log by ID
 * @access  Private
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const auditLog = await AuditLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ]
    });

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    // Role-based access check
    if (user.role === 'citizen') {
      // Citizens can only view their own logs or logs related to their entities
      if (auditLog.actorUserId !== user.id) {
        // Check if entity belongs to user
        const hasAccess = await checkCitizenAccess(user.id, auditLog.entityType, auditLog.entityId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }
    } else if (user.role === 'collector') {
      // Collectors can only view logs related to their assigned wards
      if (auditLog.actorUserId !== user.id) {
        const hasAccess = await checkCollectorAccess(user.id, auditLog.entityType, auditLog.entityId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }
    }

    res.json({
      success: true,
      data: { auditLog }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to check citizen access
 */
const checkCitizenAccess = async (userId, entityType, entityId) => {
  if (!entityId) return false;

  const { Property, Demand, Payment, Notice } = await import('../models/index.js');

  switch (entityType) {
    case 'Property':
      const property = await Property.findByPk(entityId);
      return property && property.ownerId === userId;
    
    case 'Demand':
      const demand = await Demand.findByPk(entityId, { include: [{ model: Property, as: 'property' }] });
      return demand && demand.property && demand.property.ownerId === userId;
    
    case 'Payment':
      const payment = await Payment.findByPk(entityId, { include: [{ model: Property, as: 'property' }] });
      return payment && payment.property && payment.property.ownerId === userId;
    
    case 'Notice':
      const notice = await Notice.findByPk(entityId);
      return notice && notice.ownerId === userId;
    
    default:
      return false;
  }
};

/**
 * Helper function to check collector access
 */
const checkCollectorAccess = async (collectorId, entityType, entityId) => {
  if (!entityId) return false;

  const assignedWards = await Ward.findAll({
    where: { collectorId },
    attributes: ['id']
  });
  const wardIds = assignedWards.map(w => w.id);

  const { Property, Demand, Payment, Notice } = await import('../models/index.js');

  switch (entityType) {
    case 'Ward':
      return wardIds.includes(entityId);
    
    case 'Property':
      const property = await Property.findByPk(entityId);
      return property && wardIds.includes(property.wardId);
    
    case 'Demand':
      const demand = await Demand.findByPk(entityId, { include: [{ model: Property, as: 'property' }] });
      return demand && demand.property && wardIds.includes(demand.property.wardId);
    
    case 'Payment':
      const payment = await Payment.findByPk(entityId, { include: [{ model: Property, as: 'property' }] });
      return payment && payment.property && wardIds.includes(payment.property.wardId);
    
    case 'Notice':
      const notice = await Notice.findByPk(entityId, { include: [{ model: Property, as: 'property' }] });
      return notice && notice.property && wardIds.includes(notice.property.wardId);
    
    default:
      return false;
  }
};

/**
 * @route   GET /api/audit-logs/stats/summary
 * @desc    Get audit log statistics
 * @access  Private (Admin, Assessor)
 */
export const getAuditLogStats = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const where = {};

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp[Op.gte] = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.timestamp[Op.lte] = endDate;
      }
    }

    const [
      totalLogs,
      actionTypeCounts,
      entityTypeCounts,
      roleCounts,
      recentLogs
    ] = await Promise.all([
      AuditLog.count({ where }),
      AuditLog.findAll({
        where,
        attributes: [
          'actionType',
          [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
        ],
        group: ['actionType'],
        raw: true
      }),
      AuditLog.findAll({
        where,
        attributes: [
          'entityType',
          [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
        ],
        group: ['entityType'],
        raw: true
      }),
      AuditLog.findAll({
        where,
        attributes: [
          'actorRole',
          [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
        ],
        group: ['actorRole'],
        raw: true
      }),
      AuditLog.findAll({
        where,
        limit: 10,
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: User,
            as: 'actor',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        totalLogs,
        actionTypeCounts: actionTypeCounts.reduce((acc, item) => {
          acc[item.actionType] = parseInt(item.count);
          return acc;
        }, {}),
        entityTypeCounts: entityTypeCounts.reduce((acc, item) => {
          acc[item.entityType] = parseInt(item.count);
          return acc;
        }, {}),
        roleCounts: roleCounts.reduce((acc, item) => {
          acc[item.actorRole] = parseInt(item.count);
          return acc;
        }, {}),
        recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
};
