import { PropertyApplication, WaterConnectionRequest, Property, WaterConnection, User, Ward, AuditLog, WaterConnectionDocument } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { getNextPropertyNumberInWard, generatePropertyUniqueId } from '../services/uniqueIdService.js';

// Get dashboard statistics for inspector
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use ward filter for inspector role
    const wardFilter = req.wardFilter || {};
    console.log('Inspector Dashboard - Using ward filter:', wardFilter);

    // Convert id filter to wardId for PropertyApplication table
    const propertyAppWardFilter = wardFilter.id ? { wardId: wardFilter.id } : wardFilter;
    console.log('Inspector Dashboard - Converted ward filter for PropertyApplication:', propertyAppWardFilter);

    // Convert id filter to wardId for Property table (used in includes)
    const propertyWardFilter = wardFilter.id ? { wardId: wardFilter.id } : wardFilter;
    console.log('Inspector Dashboard - Converted ward filter for Property:', propertyWardFilter);

    const stats = await Promise.all([
      // Property applications pending inspection (ward-scoped)
      PropertyApplication.count({
        where: {
          status: ['SUBMITTED', 'UNDER_INSPECTION'],
          ...propertyAppWardFilter
        }
      }),
      // Water connection requests pending inspection (ward-scoped through property)
      WaterConnectionRequest.count({
        where: {
          status: ['SUBMITTED', 'UNDER_INSPECTION']
        },
        include: [{
          model: Property,
          as: 'property',
          where: propertyWardFilter // Apply ward filter at property level
        }]
      }),
      // Property applications approved today (ward-scoped)
      PropertyApplication.count({
        where: {
          status: 'APPROVED',
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          },
          ...propertyAppWardFilter
        }
      }),
      // Water connection requests approved today (ward-scoped through property)
      WaterConnectionRequest.count({
        where: {
          status: 'APPROVED',
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          }
        },
        include: [{
          model: Property,
          as: 'property',
          where: propertyWardFilter // Apply ward filter at property level
        }]
      }),
      // Property applications rejected today (ward-scoped)
      PropertyApplication.count({
        where: {
          status: 'REJECTED',
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          },
          ...propertyAppWardFilter
        }
      }),
      // Water connection requests rejected today (ward-scoped through property)
      WaterConnectionRequest.count({
        where: {
          status: 'REJECTED',
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          }
        },
        include: [{
          model: Property,
          as: 'property',
          where: propertyWardFilter // Apply ward filter at property level
        }]
      }),
      // Property applications returned today (ward-scoped)
      PropertyApplication.count({
        where: {
          status: 'RETURNED',
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          },
          ...propertyAppWardFilter
        }
      }),
      // Water connection requests returned today (ward-scoped through property)
      WaterConnectionRequest.count({
        where: {
          status: 'RETURNED',
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          }
        },
        include: [{
          model: Property,
          as: 'property',
          where: propertyWardFilter // Apply ward filter at property level
        }]
      }),
      // Total inspections today (property + water, ward-scoped)
      PropertyApplication.count({
        where: {
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          },
          ...propertyAppWardFilter
        }
      }),
      WaterConnectionRequest.count({
        where: {
          inspectedAt: {
            [sequelize.Sequelize.Op.gte]: today
          }
        },
        include: [{
          model: Property,
          as: 'property',
          where: propertyWardFilter // Apply ward filter at property level
        }]
      })
    ]);

    console.log('Inspector Dashboard Stats - Ward-scoped results:', {
      pendingPropertyInspections: stats[0],
      pendingWaterInspections: stats[1],
      approvedPropertyToday: stats[2],
      approvedWaterToday: stats[3],
      rejectedPropertyToday: stats[4],
      rejectedWaterToday: stats[5],
      returnedPropertyToday: stats[6],
      returnedWaterToday: stats[7],
      totalInspectionsToday: stats[8] + stats[9],
      inspectorWards: req.user.ward_ids
    });

    res.json({
      pendingPropertyInspections: stats[0],
      pendingWaterInspections: stats[1],
      approvedPropertyToday: stats[2],
      approvedWaterToday: stats[3],
      rejectedPropertyToday: stats[4],
      rejectedWaterToday: stats[5],
      returnedPropertyToday: stats[6],
      returnedWaterToday: stats[7],
      totalInspectionsToday: stats[8] + stats[9]
    });
  } catch (error) {
    console.error('Error fetching inspector dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Get pending property applications for inspection
export const getPendingPropertyApplications = async (req, res) => {
  try {
    // Use ward filter for inspector role
    const wardFilter = req.wardFilter || {};
    console.log('🔍 Inspector Pending Property Apps - Using ward filter:', wardFilter);

    // Convert id filter to wardId for PropertyApplication table
    const propertyAppWardFilter = wardFilter.id ? { wardId: wardFilter.id } : wardFilter;
    console.log('🔍 Inspector Pending Property Apps - Converted ward filter:', propertyAppWardFilter);

    const applications = await PropertyApplication.findAll({
      where: {
        status: ['SUBMITTED', 'UNDER_INSPECTION'],
        ...propertyAppWardFilter
      },
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardName', 'wardNumber']
        }
      ],
      order: [['submittedAt', 'ASC']]
    });

    console.log(`Inspector Pending Property Apps - Found ${applications.length} applications in wards: [${req.user.ward_ids?.join(', ') || 'None'}]`);

    res.json(applications);
  } catch (error) {
    console.error('Error fetching pending property applications:', error);
    res.status(500).json({ error: 'Failed to fetch pending property applications' });
  }
};

// Get pending water connection requests for inspection
export const getPendingWaterConnectionRequests = async (req, res) => {
  try {
    // Use ward filter for inspector role - filter through property relationship
    const wardFilter = req.wardFilter || {};
    console.log('🔍 Inspector Pending Water Requests - Using ward filter:', wardFilter);

    // Convert id filter to wardId for Property table
    const propertyWardFilter = wardFilter.id ? { wardId: wardFilter.id } : wardFilter;
    console.log('🔍 Inspector Pending Water Requests - Converted ward filter:', propertyWardFilter);

    const requests = await WaterConnectionRequest.findAll({
      where: {
        status: { [Op.in]: ['SUBMITTED', 'UNDER_INSPECTION'] }
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address', 'wardId'],
          where: propertyWardFilter, // Apply ward filter at property level
          include: [
            {
              model: Ward,
              as: 'ward',
              attributes: ['id', 'wardName', 'wardNumber']
            }
          ]
        },
        {
          model: WaterConnectionDocument,
          as: 'documents',
          required: false
        }
      ],
      order: [['submittedAt', 'ASC']]
    });

    console.log(`Inspector Pending Water Requests - Found ${requests.length} requests in wards: [${req.user.ward_ids?.join(', ') || 'None'}]`);

    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending water connection requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending water connection requests' });
  }
};

// Get property application details for inspection
export const getPropertyApplicationForInspection = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await PropertyApplication.findByPk(id, {
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Ward,
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: 'Property application not found' });
    }

    // Check if application is in inspectable status
    if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(application.status)) {
      return res.status(403).json({ error: 'Application is not available for inspection' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching property application for inspection:', error);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
};

// Get water connection request details for inspection
export const getWaterConnectionRequestForInspection = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await WaterConnectionRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address', 'wardId'],
          include: [
            {
              model: Ward,
              as: 'ward',
              attributes: ['id', 'wardName', 'wardNumber']
            }
          ]
        },
        {
          model: WaterConnectionDocument,
          as: 'documents',
          required: false
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Water connection request not found' });
    }

    // Check ward access for inspectors
    if (req.userType === 'admin_management' && req.user.role === 'inspector') {
      const propertyWardId = request.property?.wardId;
      if (!propertyWardId || !req.user.ward_ids || !req.user.ward_ids.includes(propertyWardId)) {
        console.log(`❌ Inspector ${req.user.full_name} denied access to water connection request ${id} - Property ward ${propertyWardId} not in assigned wards [${req.user.ward_ids}]`);
        return res.status(403).json({ error: 'Access denied. This request is not in your assigned ward.' });
      }
      console.log(`✅ Inspector ${req.user.full_name} granted access to water connection request ${id} - Property ward ${propertyWardId}`);
    }

    // Check if request is in inspectable status
    if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(request.status)) {
      return res.status(403).json({ error: 'Request is not available for inspection' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching water connection request for inspection:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
};

// Process property application inspection decision
export const processPropertyInspection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { decision, inspectorRemarks, rejectionReason, escalationReason } = req.body;
    const inspectorId = req.user.id;

    // Validate decision
    if (!['APPROVE', 'REJECT', 'RETURN', 'ESCALATE'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // Validate required fields based on decision
    if (decision === 'REJECT' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required for REJECT decision' });
    }
    if (decision === 'RETURN' && !inspectorRemarks) {
      return res.status(400).json({ error: 'Inspector remarks are required for RETURN decision' });
    }
    if (decision === 'ESCALATE' && !escalationReason) {
      return res.status(400).json({ error: 'Escalation reason is required for ESCALATE decision' });
    }

    const application = await PropertyApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Property application not found' });
    }

    // Check if application is in inspectable status
    if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(application.status)) {
      return res.status(403).json({ error: 'Application is not available for inspection' });
    }

    const transaction = await sequelize.transaction();

    try {
      // Update application status and inspector details
      const updateData = {
        inspectedBy: inspectorId,
        inspectedAt: new Date()
      };

      if (decision === 'APPROVE') {
        updateData.status = 'APPROVED';
        updateData.inspectionRemarks = inspectorRemarks || 'Application approved by inspector';

        // Create actual property record (unique ID = PREFIX + WARD(3) + PROPERTY_NUMBER(4))
        const nextNum = await getNextPropertyNumberInWard(application.wardId);
        const uniqueCode = await generatePropertyUniqueId(application.wardId, application.propertyType, nextNum);
        const newProperty = await Property.create({
          propertyNumber: uniqueCode,
          uniqueCode,
          wardId: application.wardId,
          ownerId: application.applicantId,
          ownerName: application.ownerName,
          ownerPhone: application.ownerPhone,
          propertyType: application.propertyType,
          usageType: application.usageType,
          address: application.address,
          city: application.city,
          state: application.state,
          pincode: application.pincode,
          area: application.area,
          builtUpArea: application.builtUpArea,
          floors: application.floors,
          constructionType: application.constructionType,
          constructionYear: application.constructionYear,
          occupancyStatus: application.occupancyStatus,
          geolocation: application.geolocation,
          photos: application.photos,
          documents: application.documents,
          status: 'active',
          createdBy: inspectorId
        }, { transaction });

        // Link application to created property
        updateData.approvedPropertyId = newProperty.id;

      } else if (decision === 'REJECT') {
        updateData.status = 'REJECTED';
        updateData.rejectionReason = rejectionReason;
        updateData.inspectionRemarks = inspectorRemarks || 'Application rejected by inspector';
      } else if (decision === 'RETURN') {
        updateData.status = 'RETURNED';
        updateData.inspectionRemarks = inspectorRemarks;
      } else if (decision === 'ESCALATE') {
        updateData.status = 'ESCALATED_TO_OFFICER';
        updateData.inspectionRemarks = escalationReason;
        updateData.escalatedBy = inspectorId;
        updateData.escalatedAt = new Date();
      }

      await application.update(updateData, { transaction });

      // Log audit trail
      await AuditLog.create({
        actorUserId: inspectorId,
        actorRole: 'inspector',
        actionType: decision === 'APPROVE' ? 'APPROVE' : decision === 'REJECT' ? 'REJECT' : decision === 'RETURN' ? 'RETURN' : 'ESCALATE',
        entityType: 'PropertyApplication',
        entityId: application.id,
        previousData: { status: application.status },
        newData: { status: updateData.status, inspectedBy: inspectorId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }, { transaction });

      await transaction.commit();

      res.json({
        message: decision === 'ESCALATE'
          ? 'Property application escalated to officer successfully'
          : `Property application ${decision.toLowerCase()}d successfully`,
        applicationId: application.id,
        decision: decision,
        newStatus: updateData.status
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error processing property inspection:', error);
    res.status(500).json({ error: 'Failed to process inspection decision' });
  }
};

// Process water connection request inspection decision
export const processWaterInspection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { decision, inspectorRemarks, rejectionReason, escalationReason } = req.body;
    const inspectorId = req.user.id;

    // Validate decision
    if (!['APPROVE', 'REJECT', 'RETURN', 'ESCALATE'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // Validate required fields based on decision
    if (decision === 'REJECT' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required for REJECT decision' });
    }
    if (decision === 'RETURN' && !inspectorRemarks) {
      return res.status(400).json({ error: 'Inspector remarks are required for RETURN decision' });
    }
    if (decision === 'ESCALATE' && !escalationReason) {
      return res.status(400).json({ error: 'Escalation reason is required for ESCALATE decision' });
    }

    const request = await WaterConnectionRequest.findByPk(id, {
      include: [{
        model: Property,
        as: 'property',
        attributes: ['id', 'wardId']
      }]
    });

    if (!request) {
      return res.status(404).json({ error: 'Water connection request not found' });
    }

    // Check ward access for inspectors
    if (req.userType === 'admin_management' && req.user.role === 'inspector') {
      const propertyWardId = request.property?.wardId;
      if (!propertyWardId || !req.user.ward_ids || !req.user.ward_ids.includes(propertyWardId)) {
        console.log(`❌ Inspector ${req.user.full_name} denied access to process water connection request ${id} - Property ward ${propertyWardId} not in assigned wards [${req.user.ward_ids}]`);
        return res.status(403).json({ error: 'Access denied. This request is not in your assigned ward.' });
      }
      console.log(`✅ Inspector ${req.user.full_name} granted access to process water connection request ${id} - Property ward ${propertyWardId}`);
    }

    // Check if request is in inspectable status
    if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(request.status)) {
      return res.status(403).json({ error: 'Request is not available for inspection' });
    }

    const transaction = await sequelize.transaction();

    try {
      // Update request status and inspector details
      const updateData = {
        inspectedBy: inspectorId,
        inspectedAt: new Date()
      };

      if (decision === 'APPROVE') {
        updateData.status = 'APPROVED';
        updateData.adminRemarks = inspectorRemarks || 'Request approved by inspector';

        // Create actual water connection record
        const connectionNumber = await generateWaterConnectionId(request.property.wardId);
        const newConnection = await WaterConnection.create({
          connectionNumber,
          propertyId: request.propertyId,
          connectionType: request.connectionType,
          status: 'ACTIVE',
          createdBy: inspectorId
        }, { transaction });

        // Link request to created connection
        updateData.waterConnectionId = newConnection.id;

      } else if (decision === 'REJECT') {
        updateData.status = 'REJECTED';
        updateData.returnReason = rejectionReason;
        updateData.adminRemarks = inspectorRemarks || 'Request rejected by inspector';
      } else if (decision === 'RETURN') {
        updateData.status = 'RETURNED';
        updateData.adminRemarks = inspectorRemarks;
      } else if (decision === 'ESCALATE') {
        updateData.status = 'ESCALATED_TO_OFFICER';
        updateData.adminRemarks = escalationReason;
        updateData.escalatedBy = inspectorId;
        updateData.escalatedAt = new Date();
      }

      await request.update(updateData, { transaction });

      // Log audit trail
      await AuditLog.create({
        actorUserId: inspectorId,
        actorRole: 'inspector',
        actionType: decision === 'APPROVE' ? 'APPROVE' : decision === 'REJECT' ? 'REJECT' : decision === 'RETURN' ? 'RETURN' : 'ESCALATE',
        entityType: 'WaterConnectionRequest',
        entityId: request.id,
        previousData: { status: request.status },
        newData: { status: updateData.status, inspectedBy: inspectorId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }, { transaction });

      await transaction.commit();

      res.json({
        message: decision === 'ESCALATE'
          ? 'Water connection request escalated to officer successfully'
          : `Water connection request ${decision.toLowerCase()}d successfully`,
        requestId: request.id,
        decision: decision,
        newStatus: updateData.status
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error processing water inspection:', error);
    res.status(500).json({ error: 'Failed to process inspection decision' });
  }
};

// Get recent inspection actions
export const getRecentInspections = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Use ward filter for inspector role
    const wardFilter = req.wardFilter || {};
    console.log('🔍 Inspector Recent Inspections - Using ward filter:', wardFilter);

    // Convert id filter to wardId for PropertyApplication table
    const propertyAppWardFilter = wardFilter.id ? { wardId: wardFilter.id } : wardFilter;
    console.log('🔍 Inspector Recent Inspections - Converted ward filter for PropertyApplication:', propertyAppWardFilter);

    // Convert id filter to wardId for Property table (used in includes)
    const propertyWardFilter = wardFilter.id ? { wardId: wardFilter.id } : wardFilter;
    console.log('🔍 Inspector Recent Inspections - Converted ward filter for Property:', propertyWardFilter);

    const recentPropertyInspections = await PropertyApplication.findAll({
      where: {
        inspectedBy: req.user.id,
        inspectedAt: {
          [sequelize.Sequelize.Op.not]: null
        },
        ...propertyAppWardFilter
      },
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['firstName', 'lastName']
        },
        {
          model: User,
          as: 'inspector',
          attributes: ['firstName', 'lastName'],
          required: false
        }
      ],
      order: [['inspectedAt', 'DESC']],
      limit: Math.ceil(limit / 2)
    });

    const recentWaterInspections = await WaterConnectionRequest.findAll({
      where: {
        inspectedBy: req.user.id,
        inspectedAt: {
          [sequelize.Sequelize.Op.not]: null
        }
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['firstName', 'lastName']
        },
        {
          model: User,
          as: 'inspector',
          attributes: ['firstName', 'lastName'],
          required: false
        },
        {
          model: Property,
          as: 'property',
          where: propertyWardFilter, // Apply ward filter at property level
          attributes: ['id', 'propertyNumber', 'address', 'wardId']
        }
      ],
      order: [['inspectedAt', 'DESC']],
      limit: Math.ceil(limit / 2)
    });

    // Combine and sort by date
    const allInspections = [
      ...recentPropertyInspections.map(item => ({
        ...item.toJSON(),
        entityType: 'PropertyApplication',
        type: 'Property Application',
        applicationNumber: item.applicationNumber,
        inspectorName: item.inspector ? `${item.inspector.firstName} ${item.inspector.lastName}` : `${req.user.firstName} ${req.user.lastName}`
      })),
      ...recentWaterInspections.map(item => ({
        ...item.toJSON(),
        entityType: 'WaterConnectionRequest',
        type: 'Water Connection',
        applicationNumber: item.requestNumber,
        inspectorName: item.inspector ? `${item.inspector.firstName} ${item.inspector.lastName}` : `${req.user.firstName} ${req.user.lastName}`
      }))
    ].sort((a, b) => new Date(b.inspectedAt) - new Date(a.inspectedAt))
      .slice(0, limit);

    console.log(`Inspector Recent Inspections - Found ${allInspections.length} inspections in wards: [${req.user.ward_ids?.join(', ') || 'None'}]`);

    res.json(allInspections);
  } catch (error) {
    console.error('Error fetching recent inspections:', error);
    res.status(500).json({ error: 'Failed to fetch recent inspections' });
  }
};

// Get all properties in inspector's assigned wards (read-only)
export const getWardProperties = async (req, res) => {
  try {
    // Use ward filter for inspector role
    const wardFilter = req.wardFilter || {};
    console.log('🔍 Inspector Properties - Using ward filter:', wardFilter);

    // For properties, we need to filter by wardId, not id
    const propertyWardFilter = wardFilter.id ? { wardId: wardFilter.id } : wardFilter;
    console.log('🔍 Inspector Properties - Property ward filter:', propertyWardFilter);

    const properties = await Property.findAll({
      where: propertyWardFilter,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardNumber', 'wardName']
        }
      ],
      order: [['propertyNumber', 'ASC']]
    });

    console.log(`Inspector Properties - Found ${properties.length} properties in wards: [${req.user.ward_ids?.join(', ') || 'None'}]`);

    res.json({ properties });
  } catch (error) {
    console.error('Error fetching ward properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

// Get property details for inspection (read-only)
export const getPropertyDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // For properties, we need to filter by wardId, not id
    const propertyWardFilter = req.wardFilter.id ? { wardId: req.wardFilter.id } : req.wardFilter;

    const property = await Property.findOne({
      where: {
        id,
        ...propertyWardFilter // Ensure property is in inspector's assigned ward
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardNumber', 'wardName']
        }
      ]
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found or access denied' });
    }

    console.log(`🔍 Inspector Property Details - Retrieved property ${property.propertyNumber} in ward ${property.ward?.wardNumber}`);

    res.json({ property });
  } catch (error) {
    console.error('Error fetching property details:', error);
    res.status(500).json({ error: 'Failed to fetch property details' });
  }
};

// Get water connections for a property (for inspection context)
export const getPropertyWaterConnections = async (req, res) => {
  try {
    const { id } = req.params;

    // For properties, we need to filter by wardId, not id
    const propertyWardFilter = req.wardFilter.id ? { wardId: req.wardFilter.id } : req.wardFilter;

    // First verify property exists and is in inspector's ward
    const property = await Property.findOne({
      where: {
        id,
        ...propertyWardFilter
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found or access denied' });
    }

    // Get water connections for this property
    const waterConnections = await WaterConnection.findAll({
      where: {
        propertyId: id
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        }
      ],
      order: [['connectionNumber', 'ASC']]
    });

    console.log(`💧 Inspector Property Water Connections - Found ${waterConnections.length} connections for property ${property.propertyNumber}`);

    res.json({ waterConnections });
  } catch (error) {
    console.error('Error fetching property water connections:', error);
    res.status(500).json({ error: 'Failed to fetch water connections' });
  }
};

// Validation rules for inspection decisions
export const inspectionValidation = [
  body('decision')
    .isIn(['APPROVE', 'REJECT', 'RETURN', 'ESCALATE'])
    .withMessage('Decision must be APPROVE, REJECT, RETURN, or ESCALATE'),
  body('inspectorRemarks')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Inspector remarks must be between 5 and 500 characters'),
  body('rejectionReason')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Rejection reason must be between 5 and 500 characters'),
  body('escalationReason')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Escalation reason must be between 5 and 500 characters')
];
