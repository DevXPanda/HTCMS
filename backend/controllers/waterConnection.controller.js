import { WaterConnection, Property, User, WaterConnectionDocument, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { WATER_CONNECTION_STATUS } from '../constants/waterTaxStatuses.js';
import { validateMandatoryDocuments } from '../constants/waterConnectionDocumentTypes.js';
import { WaterConnectionRequest } from '../models/index.js';
import { generateWaterConnectionId } from '../services/uniqueIdService.js';

/**
 * @route   POST /api/water-connections
 * @desc    Create new water connection
 * @access  Private
 */
export const createWaterConnection = async (req, res, next) => {
  try {
    // Support both snake_case and camelCase
    const {
      propertyId,
      property_id,
      connectionType,
      connection_type,
      isMetered,
      is_metered,
      meterNumber,
      meter_number,
      pipeSize,
      pipe_size,
      monthlyRate,
      monthly_rate,
      remarks
    } = req.body;

    // Normalize to camelCase
    const normalizedPropertyId = propertyId || property_id;
    const normalizedConnectionType = connectionType || connection_type;
    const normalizedIsMetered = isMetered !== undefined ? isMetered : is_metered;
    const normalizedMeterNumber = meterNumber || meter_number;
    const normalizedPipeSize = pipeSize || pipe_size;
    const normalizedMonthlyRate = monthlyRate || monthly_rate;

    // Validate mandatory fields
    const missingFields = [];
    if (!normalizedPropertyId || normalizedPropertyId === '' || normalizedPropertyId === null || normalizedPropertyId === undefined) {
      missingFields.push('property_id');
    }
    if (!normalizedConnectionType || (typeof normalizedConnectionType === 'string' && normalizedConnectionType.trim() === '')) {
      missingFields.push('connection_type');
    }
    if (normalizedIsMetered === null || normalizedIsMetered === undefined) {
      missingFields.push('is_metered');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate connectionType enum
    const validConnectionTypes = ['domestic', 'commercial', 'industrial'];
    if (!validConnectionTypes.includes(normalizedConnectionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid connection_type. Must be one of: ${validConnectionTypes.join(', ')}`
      });
    }

    // Validate isMetered is boolean
    if (typeof normalizedIsMetered !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_metered must be a boolean value'
      });
    }

    // Validate property exists
    const property = await Property.findOne({
      where: { id: normalizedPropertyId, isActive: true }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or inactive'
      });
    }

    const connectionNumber = await generateWaterConnectionId(property.wardId);

    // Create water connection (status: DRAFT - requires documents for activation)
    const waterConnection = await WaterConnection.create({
      connectionNumber,
      propertyId: parseInt(normalizedPropertyId),
      connectionType: normalizedConnectionType,
      isMetered: normalizedIsMetered,
      meterNumber: normalizedIsMetered ? (normalizedMeterNumber || null) : null,
      pipeSize: normalizedPipeSize || null,
      monthlyRate: normalizedMonthlyRate || null,
      remarks: remarks || null,
      status: WATER_CONNECTION_STATUS.DRAFT, // Start as DRAFT, require documents for activation
      connectionDate: new Date(),
      createdBy: req.user?.id || null // Works for both User and AdminManagement tables
    });

    // Fetch created connection with property details
    const createdConnection = await WaterConnection.findOne({
      where: { id: waterConnection.id },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'city'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Water connection created successfully. Please upload mandatory documents to activate the connection.',
      data: { waterConnection: createdConnection }
    });
  } catch (error) {
    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Connection number already exists'
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/water-connections/:id
 * @desc    Update water connection (with document validation for status change to ACTIVE)
 * @access  Private
 */
export const updateWaterConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status,
      connectionType,
      connection_type,
      isMetered,
      is_metered,
      meterNumber,
      meter_number,
      pipeSize,
      pipe_size,
      monthlyRate,
      monthly_rate,
      remarks
    } = req.body;

    const waterConnection = await WaterConnection.findByPk(id);
    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    // If trying to change status to ACTIVE, validate mandatory documents
    const newStatus = status || waterConnection.status;
    if (newStatus === WATER_CONNECTION_STATUS.ACTIVE && waterConnection.status !== WATER_CONNECTION_STATUS.ACTIVE) {
      const documents = await WaterConnectionDocument.findAll({
        where: { waterConnectionId: id },
        attributes: ['documentType']
      });

      const validation = validateMandatoryDocuments(documents);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Cannot activate connection without mandatory documents',
          data: {
            missingDocuments: validation.missing
          }
        });
      }
    }

    // Update fields
    const updateData = {};
    if (status) updateData.status = status;
    if (connectionType || connection_type) updateData.connectionType = connectionType || connection_type;
    if (isMetered !== undefined || is_metered !== undefined) {
      updateData.isMetered = isMetered !== undefined ? isMetered : is_metered;
    }
    if (meterNumber !== undefined || meter_number !== undefined) {
      updateData.meterNumber = meterNumber || meter_number;
    }
    if (pipeSize !== undefined || pipe_size !== undefined) {
      updateData.pipeSize = pipeSize || pipe_size;
    }
    if (monthlyRate !== undefined || monthly_rate !== undefined) {
      updateData.monthlyRate = monthlyRate || monthly_rate;
    }
    if (remarks !== undefined) updateData.remarks = remarks;

    await waterConnection.update(updateData);

    const updatedConnection = await WaterConnection.findByPk(id, {
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'city'] }
      ]
    });

    res.json({
      success: true,
      message: 'Water connection updated successfully',
      data: { waterConnection: updatedConnection }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-connections
 * @desc    Get all water connections (with filters)
 * @access  Private
 */
export const getAllWaterConnections = async (req, res, next) => {
  try {
    console.log('Water Connections API - User:', req.user.role, 'Ward IDs:', req.user.ward_ids);
    console.log('Water Connections API - Query params:', req.query);

    const {
      propertyId,
      status,
      connectionType,
      isMetered,
      search,
      wardId,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};

    // Role-based filtering: Citizens see only their own connections
    if (req.user.role === 'citizen') {
      // Get all properties owned by the citizen
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id, isActive: true },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);

      if (propertyIds.length === 0) {
        return res.json({
          success: true,
          data: {
            connections: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }

      where.propertyId = { [Op.in]: propertyIds };
    } else if (req.user.role === 'clerk') {
      // Clerks see only water connections from their assigned ward
      if (req.user.ward_ids && req.user.ward_ids.length > 0) {
        // Get properties from clerk's assigned ward
        const wardProperties = await Property.findAll({
          where: {
            wardId: { [Op.in]: req.user.ward_ids },
            isActive: true
          },
          attributes: ['id']
        });
        const propertyIds = wardProperties.map(p => p.id);

        if (propertyIds.length === 0) {
          return res.json({
            success: true,
            data: {
              connections: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0
              }
            }
          });
        }

        where.propertyId = { [Op.in]: propertyIds };
      }
    } else if (propertyId) {
      // For other roles, allow filtering by propertyId if provided
      where.propertyId = parseInt(propertyId);
    }

    // Ward-based filtering (for clerks or when explicitly requested)
    if (wardId) {
      const wardProperties = await Property.findAll({
        where: {
          wardId: parseInt(wardId),
          isActive: true
        },
        attributes: ['id']
      });
      const propertyIds = wardProperties.map(p => p.id);

      if (propertyIds.length === 0) {
        return res.json({
          success: true,
          data: {
            connections: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }

      // If propertyId filter is also present, intersect the property IDs
      if (where.propertyId && where.propertyId[Op.in]) {
        const existingPropertyIds = where.propertyId[Op.in];
        where.propertyId = { [Op.in]: existingPropertyIds.filter(id => propertyIds.includes(id)) };
      } else {
        where.propertyId = { [Op.in]: propertyIds };
      }
    }
    if (status) {
      where.status = status;
    }
    if (connectionType) {
      where.connectionType = connectionType;
    }
    if (isMetered !== undefined) {
      where.isMetered = isMetered === 'true' || isMetered === true;
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { connectionNumber: { [Op.iLike]: `%${search}%` } },
        { meterNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await WaterConnection.findAndCountAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address', 'city', 'wardId']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    console.log('Water Connections API - Found connections:', count);
    console.log('Water Connections API - Where clause:', where);

    res.json({
      success: true,
      data: {
        waterConnections: rows, // Changed back to 'waterConnections' to match frontend expectation
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
 * @route   GET /api/water-connections/:id
 * @desc    Get water connection by ID
 * @access  Private
 */
export const getWaterConnectionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const waterConnection = await WaterConnection.findOne({
      where: { id },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: { exclude: ['password'] },
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        {
          model: WaterConnectionDocument,
          as: 'documents',
          include: [
            { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }
          ],
          order: [['uploadedAt', 'DESC']]
        }
      ]
    });

    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    res.json({
      success: true,
      data: { waterConnection }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-connections/property/:propertyId
 * @desc    Get all water connections for a property
 * @access  Private
 */
export const getWaterConnectionsByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    // Validate property exists
    const property = await Property.findOne({
      where: { id: propertyId, isActive: true }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or inactive'
      });
    }

    const waterConnections = await WaterConnection.findAll({
      where: { propertyId: parseInt(propertyId) },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address', 'city']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        property: {
          id: property.id,
          propertyNumber: property.propertyNumber,
          address: property.address
        },
        waterConnections
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-connection-requests
 * @desc    Get all water connection requests (Admin)
 * @access  Private (Admin, Assessor)
 */
export const getAllWaterConnectionRequests = async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const requests = await WaterConnectionRequest.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address'],
          include: [
            { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
          ]
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-connection-requests/:id
 * @desc    Get water connection request by ID (Admin)
 * @access  Private (Admin, Assessor)
 */
export const getWaterConnectionRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await WaterConnectionRequest.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address'],
          include: [
            { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
          ]
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber'],
          required: false
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Water connection request not found'
      });
    }

    res.json({
      success: true,
      data: { request }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/water-connection-requests/:id/approve
 * @desc    Approve water connection request and create connection (Admin)
 * @access  Private (Admin, Assessor)
 */
export const approveWaterConnectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      connectionType,
      connection_type,
      isMetered,
      is_metered,
      meterNumber,
      meter_number,
      pipeSize,
      pipe_size,
      monthlyRate,
      monthly_rate,
      remarks,
      adminRemarks
    } = req.body;

    // Find request
    const request = await WaterConnectionRequest.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Water connection request not found'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Normalize to camelCase
    const normalizedConnectionType = connectionType || connection_type || request.connectionType;
    const normalizedIsMetered = isMetered !== undefined ? isMetered : (is_metered !== undefined ? is_metered : false);
    const normalizedMeterNumber = meterNumber || meter_number || null;
    const normalizedPipeSize = pipeSize || pipe_size || null;
    const normalizedMonthlyRate = monthlyRate || monthly_rate || null;

    // Validate connectionType enum
    const validConnectionTypes = ['domestic', 'commercial', 'industrial'];
    if (!validConnectionTypes.includes(normalizedConnectionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid connectionType. Must be one of: ${validConnectionTypes.join(', ')}`
      });
    }

    // Generate connection number
    const connectionNumber = await generateWaterConnectionId(request.property.wardId);

    // Create water connection
    const waterConnection = await WaterConnection.create({
      connectionNumber,
      propertyId: request.propertyId,
      connectionType: normalizedConnectionType,
      isMetered: normalizedIsMetered,
      meterNumber: normalizedIsMetered ? normalizedMeterNumber : null,
      pipeSize: normalizedPipeSize,
      monthlyRate: normalizedMonthlyRate,
      remarks: remarks || request.remarks || null,
      status: 'ACTIVE',
      connectionDate: new Date(),
      createdBy: userId
    });

    // Update request
    await request.update({
      status: 'APPROVED',
      processedBy: userId,
      processedAt: new Date(),
      adminRemarks: adminRemarks || null,
      waterConnectionId: waterConnection.id
    });

    // Fetch updated request with relations
    const updatedRequest = await WaterConnectionRequest.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      message: 'Water connection request approved and connection created successfully',
      data: {
        request: updatedRequest,
        waterConnection
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/water-connection-requests/:id/reject
 * @desc    Reject water connection request (Admin)
 * @access  Private (Admin, Assessor)
 */
export const rejectWaterConnectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { adminRemarks } = req.body;

    const request = await WaterConnectionRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Water connection request not found'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Update request
    await request.update({
      status: 'REJECTED',
      processedBy: userId,
      processedAt: new Date(),
      adminRemarks: adminRemarks || null
    });

    // Fetch updated request
    const updatedRequest = await WaterConnectionRequest.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Water connection request rejected',
      data: { request: updatedRequest }
    });
  } catch (error) {
    next(error);
  }
};
