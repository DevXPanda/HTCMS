import { FieldVisit, FollowUp, CollectorTask, Demand, Property, User, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * @route   GET /api/field-monitoring/dashboard
 * @desc    Get field operations dashboard data (Admin only)
 * @access  Private (Admin, Assessor)
 */
export const getFieldDashboard = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== 'admin' && user.role !== 'assessor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin and assessor can view field monitoring.'
      });
    }

    const { dateFrom, dateTo, collectorId } = req.query;

    const where = {};
    const visitWhere = {};
    const taskWhere = {};

    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) {
        dateFilter[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter[Op.lte] = endDate;
      }
      visitWhere.visitDate = dateFilter;
      taskWhere.taskDate = dateFilter;
    }

    if (collectorId) {
      visitWhere.collectorId = collectorId;
      taskWhere.collectorId = collectorId;
    }

    // Overall statistics
    const totalVisits = await FieldVisit.count({ where: visitWhere });
    const totalTasks = await CollectorTask.count({ where: taskWhere });
    const activeFollowUps = await FollowUp.count({
      where: {
        isResolved: false
      }
    });
    const enforcementEligible = await FollowUp.count({
      where: {
        isEnforcementEligible: true,
        noticeTriggered: false
      }
    });

    // Today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayVisits = await FieldVisit.count({
      where: {
        ...visitWhere,
        visitDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    const todayTasks = await CollectorTask.count({
      where: {
        ...taskWhere,
        taskDate: today.toISOString().split('T')[0],
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      }
    });

    // Collector-wise statistics
    const collectors = await User.findAll({
      where: {
        role: 'collector',
        isActive: true
      },
      include: [
        {
          model: Ward,
          as: 'assignedWards',
          attributes: ['id', 'wardNumber', 'wardName']
        }
      ]
    });

    const collectorStats = await Promise.all(
      collectors.map(async (collector) => {
        const collectorVisitWhere = {
          ...visitWhere,
          collectorId: collector.id
        };
        const collectorTaskWhere = {
          ...taskWhere,
          collectorId: collector.id
        };

        const visits = await FieldVisit.count({ where: collectorVisitWhere });
        const todayVisitsCount = await FieldVisit.count({
          where: {
            ...collectorVisitWhere,
            visitDate: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          }
        });
        const pendingTasks = await CollectorTask.count({
          where: {
            ...collectorTaskWhere,
            status: {
              [Op.in]: ['pending', 'in_progress']
            }
          }
        });
        const completedTasks = await CollectorTask.count({
          where: {
            ...collectorTaskWhere,
            status: 'completed'
          }
        });

        // Get follow-ups in collector's wards
        const wardIds = collector.assignedWards.map(w => w.id);
        const followUpsInWards = await FollowUp.count({
          where: {
            isResolved: false
          },
          include: [
            {
              model: Property,
              as: 'property',
              where: {
                wardId: {
                  [Op.in]: wardIds
                }
              },
              required: true
            }
          ]
        });

        return {
          collectorId: collector.id,
          collectorName: `${collector.firstName} ${collector.lastName}`,
          email: collector.email,
          assignedWards: collector.assignedWards.map(w => w.wardNumber).join(', '),
          totalVisits: visits,
          todayVisits: todayVisitsCount,
          pendingTasks,
          completedTasks,
          followUpsInWards
        };
      })
    );

    // Visit type breakdown
    const visitTypeBreakdown = await FieldVisit.findAll({
      attributes: [
        'visitType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: visitWhere,
      group: ['visitType'],
      raw: true
    });

    // Citizen response breakdown
    const responseBreakdown = await FieldVisit.findAll({
      attributes: [
        'citizenResponse',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: visitWhere,
      group: ['citizenResponse'],
      raw: true
    });

    // Escalation status breakdown
    const escalationBreakdown = await FollowUp.findAll({
      attributes: [
        'escalationStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        isResolved: false
      },
      group: ['escalationStatus'],
      raw: true
    });

    // Recent visits
    const recentVisits = await FieldVisit.findAll({
      where: visitWhere,
      include: [
        {
          model: User,
          as: 'collector',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount']
        }
      ],
      order: [['visitDate', 'DESC']],
      limit: 10
    });

    // High priority follow-ups
    const highPriorityFollowUps = await FollowUp.findAll({
      where: {
        isResolved: false,
        priority: {
          [Op.in]: ['high', 'critical']
        }
      },
      include: [
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount', 'overdueDays']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address'],
          include: [
            {
              model: Ward,
              as: 'ward',
              attributes: ['id', 'wardNumber', 'wardName']
            }
          ]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'phone']
        }
      ],
      order: [['priority', 'DESC'], ['visitCount', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalVisits,
          todayVisits,
          totalTasks,
          todayTasks,
          activeFollowUps,
          enforcementEligible
        },
        collectorStats,
        breakdowns: {
          visitType: visitTypeBreakdown,
          citizenResponse: responseBreakdown,
          escalationStatus: escalationBreakdown
        },
        recentVisits,
        highPriorityFollowUps
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/field-monitoring/collector/:collectorId
 * @desc    Get detailed statistics for a specific collector
 * @access  Private (Admin, Assessor)
 */
export const getCollectorDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { collectorId } = req.params;

    if (user.role !== 'admin' && user.role !== 'assessor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const collector = await User.findByPk(collectorId, {
      include: [
        {
          model: Ward,
          as: 'assignedWards',
          attributes: ['id', 'wardNumber', 'wardName']
        }
      ]
    });

    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found'
      });
    }

    const { dateFrom, dateTo } = req.query;

    const visitWhere = {
      collectorId: collector.id
    };

    if (dateFrom || dateTo) {
      visitWhere.visitDate = {};
      if (dateFrom) {
        visitWhere.visitDate[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        visitWhere.visitDate[Op.lte] = endDate;
      }
    }

    // Visit statistics
    const totalVisits = await FieldVisit.count({ where: visitWhere });
    const visitsByType = await FieldVisit.findAll({
      attributes: [
        'visitType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: visitWhere,
      group: ['visitType'],
      raw: true
    });

    // Task statistics
    const taskWhere = {
      collectorId: collector.id
    };
    if (dateFrom || dateTo) {
      taskWhere.taskDate = {};
      if (dateFrom) {
        taskWhere.taskDate[Op.gte] = dateFrom;
      }
      if (dateTo) {
        taskWhere.taskDate[Op.lte] = dateTo;
      }
    }

    const totalTasks = await CollectorTask.count({ where: taskWhere });
    const completedTasks = await CollectorTask.count({
      where: {
        ...taskWhere,
        status: 'completed'
      }
    });
    const pendingTasks = await CollectorTask.count({
      where: {
        ...taskWhere,
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      }
    });

    // Recent visits
    const recentVisits = await FieldVisit.findAll({
      where: visitWhere,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount']
        }
      ],
      order: [['visitDate', 'DESC']],
      limit: 20
    });

    // Follow-ups in collector's wards
    const wardIds = collector.assignedWards.map(w => w.id);
    const followUpsInWards = await FollowUp.findAll({
      where: {
        isResolved: false
      },
      include: [
        {
          model: Property,
          as: 'property',
          where: {
            wardId: {
              [Op.in]: wardIds
            }
          },
          required: true,
          attributes: ['id', 'propertyNumber', 'address']
        },
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount', 'overdueDays']
        }
      ],
      order: [['priority', 'DESC'], ['visitCount', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      data: {
        collector: {
          id: collector.id,
          name: `${collector.firstName} ${collector.lastName}`,
          email: collector.email,
          phone: collector.phone,
          assignedWards: collector.assignedWards
        },
        statistics: {
          totalVisits,
          visitsByType,
          totalTasks,
          completedTasks,
          pendingTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0
        },
        recentVisits,
        followUpsInWards
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/field-monitoring/follow-ups
 * @desc    Get all follow-ups with filters (Admin only)
 * @access  Private (Admin, Assessor)
 */
export const getFollowUps = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== 'admin' && user.role !== 'assessor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      propertyId,
      demandId,
      escalationStatus,
      priority,
      isEnforcementEligible,
      isResolved,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (propertyId) where.propertyId = propertyId;
    if (demandId) where.demandId = demandId;
    if (escalationStatus) where.escalationStatus = escalationStatus;
    if (priority) where.priority = priority;
    if (isEnforcementEligible !== undefined) where.isEnforcementEligible = isEnforcementEligible === 'true';
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await FollowUp.findAndCountAll({
      where,
      include: [
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount', 'overdueDays', 'dueDate']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address'],
          include: [
            {
              model: Ward,
              as: 'ward',
              attributes: ['id', 'wardNumber', 'wardName']
            }
          ]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: FieldVisit,
          as: 'lastVisit',
          attributes: ['id', 'visitDate', 'visitType', 'citizenResponse']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['priority', 'DESC'], ['visitCount', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        followUps: rows,
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
