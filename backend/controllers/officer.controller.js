import {
  PropertyApplication,
  WaterConnectionRequest,
  Property,
  WaterConnection,
  Ward,
  AuditLog,
  WaterConnectionDocument,
  User,
  AdminManagement
} from '../models/index.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import { getNextPropertyNumberInWard, generatePropertyUniqueId } from '../services/uniqueIdService.js';

// Helper function to get corresponding user ID from admin_management
const getCorrespondingUserId = async (adminManagementId) => {
  try {
    const adminUser = await AdminManagement.findByPk(adminManagementId);
    if (!adminUser) {
      console.error('Admin user not found:', adminManagementId);
      return adminManagementId; // Fallback to original ID
    }

    // Find corresponding user in users table
    const correspondingUser = await User.findOne({
      where: { email: adminUser.email }
    });

    if (correspondingUser) {
      console.log(`Found corresponding user ID: ${correspondingUser.id} for admin ID: ${adminManagementId}`);
      return correspondingUser.id;
    } else {
      console.warn(`No corresponding user found for admin ID: ${adminManagementId}`);
      return adminManagementId; // Fallback to original ID
    }
  } catch (error) {
    console.error('Error getting corresponding user ID:', error);
    return adminManagementId; // Fallback to original ID
  }
};

// Get officer dashboard data
export const getDashboard = async (req, res) => {
  try {
    // Apply ward-based filtering for officers
    const wardFilter = req.wardFilter || {};

    // Translate wardFilter from {id: ...} to {wardId: ...} for Property model
    const propertyWardFilter = wardFilter.id ? { wardId: wardFilter.id } : {};

    // Use officer's admin_management ID directly
    const officerId = req.user.id;
    console.log(`Getting dashboard stats for officer ID: ${officerId}`);

    const escalatedPropertyApps = await PropertyApplication.count({
      where: {
        status: 'ESCALATED_TO_OFFICER',
        ...wardFilter
      }
    });

    const escalatedWaterRequests = await WaterConnectionRequest.count({
      where: {
        status: 'ESCALATED_TO_OFFICER'
      },
      include: [{
        model: Property,
        as: 'property',
        ...(Object.keys(propertyWardFilter).length > 0 && { where: propertyWardFilter }),
        required: true
      }]
    });

    const approvedByOfficer = await PropertyApplication.count({
      where: {
        status: 'APPROVED',
        decidedby: officerId,
        ...wardFilter
      }
    }) + await WaterConnectionRequest.count({
      where: {
        status: 'APPROVED',
        decidedby: officerId
      },
      include: [{
        model: Property,
        as: 'property',
        ...(Object.keys(propertyWardFilter).length > 0 && { where: propertyWardFilter }),
        required: true
      }]
    });

    const rejectedByOfficer = await PropertyApplication.count({
      where: {
        status: 'REJECTED',
        decidedby: officerId,
        ...wardFilter
      }
    }) + await WaterConnectionRequest.count({
      where: {
        status: 'REJECTED',
        decidedby: officerId
      },
      include: [{
        model: Property,
        as: 'property',
        ...(Object.keys(propertyWardFilter).length > 0 && { where: propertyWardFilter }),
        required: true
      }]
    });

    console.log(`Dashboard stats - Approved: ${approvedByOfficer}, Rejected: ${rejectedByOfficer}`);

    res.json({
      escalatedPropertyApps,
      escalatedWaterRequests,
      approvedByOfficer,
      rejectedByOfficer,
      totalPending: escalatedPropertyApps + escalatedWaterRequests
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get escalated property applications
export const getEscalatedPropertyApplications = async (req, res) => {
  try {
    // Apply ward-based filtering for officers
    const wardFilter = req.wardFilter || {};

    const applications = await PropertyApplication.findAll({
      where: {
        status: 'ESCALATED_TO_OFFICER',
        ...wardFilter
      },
      include: [
        {
          association: 'applicant',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          association: 'approvedProperty',
          attributes: ['id', 'propertyNumber', 'address'],
          required: false
        },
        {
          model: Ward,
          as: 'ward'
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get escalated water connection requests
export const getEscalatedWaterRequests = async (req, res) => {
  try {
    console.log('getEscalatedWaterRequests - Starting...');
    // Apply ward-based filtering for officers
    const wardFilter = req.wardFilter || {};
    console.log('getEscalatedWaterRequests - Ward filter:', wardFilter);
    console.log('getEscalatedWaterRequests - req.user.ward_ids:', req.user.ward_ids);
    console.log('getEscalatedWaterRequests - req.user.id:', req.user.id);
    console.log('getEscalatedWaterRequests - req.user.role:', req.user.role);

    // Translate wardFilter from {id: ...} to {wardId: ...} for Property model
    const propertyWardFilter = wardFilter.id ? { wardId: wardFilter.id } : {};
    console.log('getEscalatedWaterRequests - Property ward filter:', propertyWardFilter);

    const requests = await WaterConnectionRequest.findAll({
      where: { status: 'ESCALATED_TO_OFFICER' },
      include: [
        {
          model: Property,
          as: 'property',
          ...(Object.keys(propertyWardFilter).length > 0 && { where: propertyWardFilter })
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: AdminManagement,
          as: 'escalatedByInspector',
          attributes: ['id', 'full_name', 'employee_id', 'role']
        },
        {
          model: WaterConnectionDocument,
          as: 'documents',
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    console.log('getEscalatedWaterRequests - Found requests:', requests.length);
    console.log('getEscalatedWaterRequests - Request IDs:', requests.map(r => r.id));

    res.json(requests);
  } catch (error) {
    console.error('getEscalatedWaterRequests Error:', error.message);
    console.error('Full error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Make decision on property application
export const decidePropertyApplication = async (req, res) => {
  const { id } = req.params;
  const { decision, officerRemarks } = req.body;

  if (!['APPROVE', 'REJECT', 'SEND_BACK'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }

  if (!officerRemarks && decision !== 'APPROVE') {
    return res.status(400).json({ error: 'Officer remarks required for REJECT and SEND_BACK decisions' });
  }

  const transaction = await sequelize.transaction();

  try {
    const application = await PropertyApplication.findOne({
      where: { id, status: 'ESCALATED_TO_OFFICER' },
      transaction
    });

    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Application not found or not escalated to officer' });
    }

    // Get corresponding user ID for decidedby field
    const correspondingUserId = await getCorrespondingUserId(req.user.id);

    let newStatus;
    let approvedPropertyId = null;

    switch (decision) {
      case 'APPROVE':
        newStatus = 'APPROVED';
        // Create property from application (unique ID = PREFIX + WARD(3) + PROPERTY_NUMBER(4))
        const nextNum = await getNextPropertyNumberInWard(application.wardId);
        const uniqueCode = generatePropertyUniqueId(application.wardId, application.propertyType, nextNum);
        const propertyNumber = uniqueCode;
        const newProperty = await Property.create({
          propertyNumber,
          uniqueCode,
          ownerId: application.applicantId,
          wardId: application.wardId,
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
          applicationId: application.id,
          createdBy: req.user.id
        }, { transaction });
        approvedPropertyId = newProperty.id;
        break;

      case 'REJECT':
        newStatus = 'REJECTED';
        application.rejectionReason = officerRemarks;
        break;

      case 'SEND_BACK':
        newStatus = 'UNDER_INSPECTION';
        break;
    }

    // Update application
    await application.update({
      status: newStatus,
      officerremarks: officerRemarks,
      decidedby: correspondingUserId,
      decidedat: new Date(),
      approvedPropertyId
    }, { transaction });

    // Create audit log
    await AuditLog.create({
      actorUserId: correspondingUserId,
      actorRole: req.user.role,
      actionType: decision === 'APPROVE' ? 'APPROVE' : decision === 'REJECT' ? 'REJECT' : 'UPDATE',
      action: `OFFICER_${decision}`,
      entityType: 'PropertyApplication',
      entityId: application.id,
      previousData: { status: 'ESCALATED_TO_OFFICER' },
      newData: {
        status: newStatus,
        officerremarks: officerRemarks,
        decidedby: correspondingUserId,
        decidedat: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, { transaction });

    await transaction.commit();

    res.json({
      message: `Application ${decision.toLowerCase()}d successfully`,
      application: await PropertyApplication.findByPk(id, {
        include: [
          {
            model: Property,
            as: 'property'
          }
        ]
      })
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Make decision on water connection request
export const decideWaterRequest = async (req, res) => {
  const { id } = req.params;
  const { decision, officerRemarks } = req.body;

  if (!['APPROVE', 'REJECT', 'SEND_BACK'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }

  if (!officerRemarks && decision !== 'APPROVE') {
    return res.status(400).json({ error: 'Officer remarks required for REJECT and SEND_BACK decisions' });
  }

  const transaction = await sequelize.transaction();

  try {
    const request = await WaterConnectionRequest.findOne({
      where: { id, status: 'ESCALATED_TO_OFFICER' },
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found or not escalated to officer' });
    }

    // Use officer's admin_management ID directly
    const officerId = req.user.id;
    console.log(`Officer ${req.user.full_name} (ID: ${officerId}) making decision: ${decision}`);

    let newStatus;
    let waterConnectionId = null;

    switch (decision) {
      case 'APPROVE':
        newStatus = 'APPROVED';
        // Create water connection from request
        const connectionCount = await WaterConnection.count({ transaction });
        const newConnection = await WaterConnection.create({
          connectionNumber: `WC-${Date.now()}-${connectionCount + 1}`,
          propertyId: request.propertyId,
          connectionType: request.connectionType,
          status: 'ACTIVE',
          connectionDate: new Date(),
          meterNumber: `MTR${Date.now()}`,
          documents: request.documents,
          applicationId: request.id,
          createdBy: req.user.id
        }, { transaction });
        waterConnectionId = newConnection.id;
        break;

      case 'REJECT':
        newStatus = 'REJECTED';
        request.returnReason = officerRemarks;
        break;

      case 'SEND_BACK':
        newStatus = 'UNDER_INSPECTION';
        break;
    }

    // Update request
    await request.update({
      status: newStatus,
      officerremarks: officerRemarks,
      decidedby: officerId,
      decidedat: new Date(),
      waterConnectionId
    }, { transaction });

    // Create audit log
    await AuditLog.create({
      actorUserId: officerId,
      actorRole: req.user.role,
      actionType: decision === 'APPROVE' ? 'APPROVE' : decision === 'REJECT' ? 'REJECT' : 'UPDATE',
      action: `OFFICER_${decision}`,
      entityType: 'WaterConnectionRequest',
      entityId: request.id,
      previousData: { status: 'ESCALATED_TO_OFFICER' },
      newData: {
        status: newStatus,
        officerremarks: officerRemarks,
        decidedby: officerId,
        decidedat: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, { transaction });

    await transaction.commit();

    res.json({
      message: `Request ${decision.toLowerCase()}d successfully`,
      request: await WaterConnectionRequest.findByPk(id, {
        include: [
          {
            model: WaterConnection,
            as: 'waterConnection'
          }
        ]
      })
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Get officer decision history
export const getDecisionHistory = async (req, res) => {
  try {
    // Apply ward-based filtering for officers
    const wardFilter = req.wardFilter || {};

    // Translate wardFilter from {id: ...} to {wardId: ...} for Property model
    const propertyWardFilter = wardFilter.id ? { wardId: wardFilter.id } : {};

    // Use officer's admin_management ID directly
    const officerId = req.user.id;
    console.log(`Getting decision history for officer ID: ${officerId}`);

    const propertyDecisions = await PropertyApplication.findAll({
      where: {
        decidedby: officerId,
        status: ['APPROVED', 'REJECTED'],
        ...wardFilter
      },
      include: [
        {
          association: 'applicant',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Ward,
          as: 'ward'
        }
      ],
      order: [['decidedat', 'DESC']]
    });

    const waterDecisions = await WaterConnectionRequest.findAll({
      where: {
        decidedby: officerId,
        status: ['APPROVED', 'REJECTED']
      },
      include: [
        {
          association: 'requester',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Property,
          as: 'property',
          ...(Object.keys(propertyWardFilter).length > 0 && { where: propertyWardFilter }),
          required: true
        }
      ],
      order: [['decidedat', 'DESC']]
    });

    console.log(`Found ${propertyDecisions.length} property decisions and ${waterDecisions.length} water decisions`);

    res.json({
      propertyDecisions,
      waterDecisions
    });
  } catch (error) {
    console.error('Error getting decision history:', error);
    res.status(500).json({ error: error.message });
  }
};
