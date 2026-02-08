import { FieldVisit, FollowUp, CollectorTask, Demand, Property, User, Ward, AdminManagement, WaterConnectionRequest, PropertyApplication, CollectorAttendance } from '../models/index.js';
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

    const { dateFrom, dateTo, collectorId, role, wardId, activityType, status } = req.query;

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

    // Get all field staff (collectors, inspectors, clerks, officers)
    const fieldStaff = await AdminManagement.findAll({
      where: {
        role: ['collector', 'inspector', 'clerk', 'officer']
      }
    });

    const collectorStats = await Promise.all(
      fieldStaff
        .filter(staff => staff.role === 'collector')
        .map(async (staff) => {
          const collectorVisitWhere = {
            ...visitWhere,
            collectorId: staff.id
          };
          const collectorTaskWhere = {
            ...taskWhere,
            collectorId: staff.id
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
          const wardIds = staff.ward_ids || [];
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
            collectorId: staff.id,
            collectorName: staff.full_name,
            email: staff.email,
            assignedWards: wardIds.length > 0 ? `Wards: ${wardIds.join(', ')}` : 'No wards assigned',
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

    // Comprehensive Field Activity Data for All Roles
    const allFieldActivities = [];

    // 1. Collector Activities (Field Visits)
    const collectorVisits = await FieldVisit.findAll({
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
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount']
        }
      ],
      order: [['visitDate', 'DESC']],
      limit: 50
    });

    collectorVisits.forEach(visit => {
      allFieldActivities.push({
        id: `field-visit-${visit.id}`,
        userName: `${visit.collector?.firstName || ''} ${visit.collector?.lastName || ''}`.trim(),
        role: 'Collector',
        ward: visit.property?.ward?.wardName || 'Unknown',
        activityType: visit.visitType?.replace('_', ' ') || 'Field Visit',
        entityType: 'Property',
        entityIdentifier: visit.property?.propertyNumber || 'Unknown',
        timestamp: visit.visitDate,
        status: visit.isWithinAttendanceWindow ? 'completed' : 'pending',
        details: {
          visitId: visit.id,
          citizenResponse: visit.citizenResponse,
          remarks: visit.remarks,
          demandBalance: visit.demand?.balanceAmount
        }
      });
    });

    // 2. Inspector Activities (Property Application Inspections)
    const inspectorPropertyInspections = await PropertyApplication.findAll({
      where: {
        inspectedBy: { [Op.not]: null },
        inspectedAt: dateFrom || dateTo ? {
          [Op.and]: [
            dateFrom ? { [Op.gte]: new Date(dateFrom) } : {},
            dateTo ? { [Op.lte]: new Date(dateTo).setHours(23, 59, 59, 999) } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        } : {}
      },
      include: [
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardNumber', 'wardName']
        }
      ],
      order: [['inspectedAt', 'DESC']],
      limit: 50
    });

    inspectorPropertyInspections.forEach(inspection => {
      allFieldActivities.push({
        id: `property-inspection-${inspection.id}`,
        userName: `${inspection.inspector?.firstName || ''} ${inspection.inspector?.lastName || ''}`.trim(),
        role: 'Inspector',
        ward: inspection.ward?.wardName || 'Unknown',
        activityType: 'Property Inspection',
        entityType: 'Property Application',
        entityIdentifier: inspection.applicationNumber || `PA-${inspection.id}`,
        timestamp: inspection.inspectedAt,
        status: inspection.status === 'APPROVED' ? 'completed' : 
               inspection.status === 'REJECTED' ? 'completed' : 'pending',
        details: {
          applicationId: inspection.id,
          inspectionStatus: inspection.status,
          inspectorRemarks: inspection.inspectorRemarks
        }
      });
    });

    // 3. Inspector Activities (Water Connection Inspections)
    const inspectorWaterInspections = await WaterConnectionRequest.findAll({
      where: {
        inspectedBy: { [Op.not]: null },
        inspectedAt: dateFrom || dateTo ? {
          [Op.and]: [
            dateFrom ? { [Op.gte]: new Date(dateFrom) } : {},
            dateTo ? { [Op.lte]: new Date(dateTo).setHours(23, 59, 59, 999) } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        } : {}
      },
      include: [
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'firstName', 'lastName']
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
        }
      ],
      order: [['inspectedAt', 'DESC']],
      limit: 50
    });

    inspectorWaterInspections.forEach(inspection => {
      allFieldActivities.push({
        id: `water-inspection-${inspection.id}`,
        userName: `${inspection.inspector?.firstName || ''} ${inspection.inspector?.lastName || ''}`.trim(),
        role: 'Inspector',
        ward: inspection.property?.ward?.wardName || 'Unknown',
        activityType: 'Water Connection Inspection',
        entityType: 'Water Request',
        entityIdentifier: inspection.requestNumber || `WR-${inspection.id}`,
        timestamp: inspection.inspectedAt,
        status: inspection.status === 'APPROVED' ? 'completed' : 
               inspection.status === 'REJECTED' ? 'completed' : 'pending',
        details: {
          requestId: inspection.id,
          inspectionStatus: inspection.status,
          inspectorRemarks: inspection.inspectorRemarks,
          connectionType: inspection.connectionType
        }
      });
    });

    // 4. Clerk Activities (Property Application Processing)
    const clerkPropertyActivities = await PropertyApplication.findAll({
      where: {
        status: ['SUBMITTED', 'UNDER_INSPECTION', 'ESCALATED_TO_OFFICER'],
        createdAt: dateFrom || dateTo ? {
          [Op.and]: [
            dateFrom ? { [Op.gte]: new Date(dateFrom) } : {},
            dateTo ? { [Op.lte]: new Date(dateTo).setHours(23, 59, 59, 999) } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        } : {}
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardNumber', 'wardName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    clerkPropertyActivities.forEach(activity => {
      allFieldActivities.push({
        id: `clerk-property-${activity.id}`,
        userName: `${activity.creator?.firstName || ''} ${activity.creator?.lastName || ''}`.trim(),
        role: 'Clerk',
        ward: activity.ward?.wardName || 'Unknown',
        activityType: 'Property Application Processing',
        entityType: 'Property Application',
        entityIdentifier: activity.applicationNumber || `PA-${activity.id}`,
        timestamp: activity.createdAt,
        status: activity.status === 'SUBMITTED' ? 'pending' : 
               activity.status === 'UNDER_INSPECTION' ? 'pending' : 'completed',
        details: {
          applicationId: activity.id,
          applicationStatus: activity.status,
          propertyType: activity.propertyType
        }
      });
    });

    // 5. Clerk Activities (Water Connection Processing)
    const clerkWaterActivities = await WaterConnectionRequest.findAll({
      where: {
        status: ['SUBMITTED', 'UNDER_INSPECTION', 'ESCALATED_TO_OFFICER'],
        createdAt: dateFrom || dateTo ? {
          [Op.and]: [
            dateFrom ? { [Op.gte]: new Date(dateFrom) } : {},
            dateTo ? { [Op.lte]: new Date(dateTo).setHours(23, 59, 59, 999) } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        } : {}
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
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
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    clerkWaterActivities.forEach(activity => {
      allFieldActivities.push({
        id: `clerk-water-${activity.id}`,
        userName: `${activity.creator?.firstName || ''} ${activity.creator?.lastName || ''}`.trim(),
        role: 'Clerk',
        ward: activity.property?.ward?.wardName || 'Unknown',
        activityType: 'Water Connection Processing',
        entityType: 'Water Request',
        entityIdentifier: activity.requestNumber || `WR-${activity.id}`,
        timestamp: activity.createdAt,
        status: activity.status === 'SUBMITTED' ? 'pending' : 
               activity.status === 'UNDER_INSPECTION' ? 'pending' : 'completed',
        details: {
          requestId: activity.id,
          requestStatus: activity.status,
          connectionType: activity.connectionType
        }
      });
    });

    // 6. Officer Activities (Property Application Decisions)
    const officerPropertyDecisions = await PropertyApplication.findAll({
      where: {
        decidedby: { [Op.not]: null },
        decidedat: dateFrom || dateTo ? {
          [Op.and]: [
            dateFrom ? { [Op.gte]: new Date(dateFrom) } : {},
            dateTo ? { [Op.lte]: new Date(dateTo).setHours(23, 59, 59, 999) } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        } : {}
      },
      include: [
        {
          model: User,
          as: 'decidedByOfficer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardNumber', 'wardName']
        }
      ],
      order: [['decidedat', 'DESC']],
      limit: 50
    });

    officerPropertyDecisions.forEach(decision => {
      allFieldActivities.push({
        id: `officer-property-${decision.id}`,
        userName: `${decision.decidedByOfficer?.firstName || ''} ${decision.decidedByOfficer?.lastName || ''}`.trim(),
        role: 'Officer',
        ward: decision.ward?.wardName || 'Unknown',
        activityType: 'Property Application Decision',
        entityType: 'Property Application',
        entityIdentifier: decision.applicationNumber || `PA-${decision.id}`,
        timestamp: decision.decidedat,
        status: 'completed',
        details: {
          applicationId: decision.id,
          decisionStatus: decision.status,
          officerRemarks: decision.officerremarks
        }
      });
    });

    // 7. Officer Activities (Water Connection Decisions)
    const officerWaterDecisions = await WaterConnectionRequest.findAll({
      where: {
        decidedby: { [Op.not]: null },
        decidedat: dateFrom || dateTo ? {
          [Op.and]: [
            dateFrom ? { [Op.gte]: new Date(dateFrom) } : {},
            dateTo ? { [Op.lte]: new Date(dateTo).setHours(23, 59, 59, 999) } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        } : {}
      },
      include: [
        {
          model: User,
          as: 'decidedByOfficer',
          attributes: ['id', 'firstName', 'lastName']
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
        }
      ],
      order: [['decidedat', 'DESC']],
      limit: 50
    });

    officerWaterDecisions.forEach(decision => {
      allFieldActivities.push({
        id: `officer-water-${decision.id}`,
        userName: `${decision.decidedByOfficer?.firstName || ''} ${decision.decidedByOfficer?.lastName || ''}`.trim(),
        role: 'Officer',
        ward: decision.property?.ward?.wardName || 'Unknown',
        activityType: 'Water Connection Decision',
        entityType: 'Water Request',
        entityIdentifier: decision.requestNumber || `WR-${decision.id}`,
        timestamp: decision.decidedat,
        status: 'completed',
        details: {
          requestId: decision.id,
          decisionStatus: decision.status,
          officerRemarks: decision.officerremarks
        }
      });
    });

    // Sort all activities by timestamp (most recent first)
    allFieldActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply additional filters to activities
    let filteredActivities = allFieldActivities;
    
    // Filter by role
    if (role && role !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.role.toLowerCase() === role.toLowerCase()
      );
    }
    
    // Filter by ward
    if (wardId && wardId !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.ward && activity.ward.includes(wardId)
      );
    }
    
    // Filter by activity type
    if (activityType && activityType !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.activityType.toLowerCase().includes(activityType.toLowerCase())
      );
    }
    
    // Filter by status
    if (status && status !== 'all') {
      filteredActivities = filteredActivities.filter(activity => 
        activity.status.toLowerCase() === status.toLowerCase()
      );
    }

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
        highPriorityFollowUps,
        allFieldActivities: filteredActivities.slice(0, 100), // Limit to 100 most recent filtered activities
        activitySummary: {
          totalActivities: filteredActivities.length,
          byRole: {
            collector: filteredActivities.filter(a => a.role === 'Collector').length,
            inspector: filteredActivities.filter(a => a.role === 'Inspector').length,
            clerk: filteredActivities.filter(a => a.role === 'Clerk').length,
            officer: filteredActivities.filter(a => a.role === 'Officer').length
          },
          byStatus: {
            completed: filteredActivities.filter(a => a.status === 'completed').length,
            pending: filteredActivities.filter(a => a.status === 'pending').length,
            delayed: filteredActivities.filter(a => a.status === 'delayed').length
          }
        }
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
