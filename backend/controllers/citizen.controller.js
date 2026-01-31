import { Property, Demand, Payment, Assessment, Ward, Notice, WaterTaxAssessment, WaterConnection, WaterConnectionRequest } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @route   GET /api/citizen/dashboard
 * @desc    Get citizen dashboard data
 * @access  Private (Citizen)
 */
export const getCitizenDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user properties
    const properties = await Property.findAll({
      where: { ownerId: userId, isActive: true },
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ]
    });

    const propertyIds = properties.map(p => p.id);

    // Get total outstanding - separate by serviceType
    const demands = await Demand.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        balanceAmount: { [Op.gt]: 0 }
      }
    });

    const houseTaxDemands = demands.filter(d => d.serviceType === 'HOUSE_TAX');
    const waterTaxDemands = demands.filter(d => d.serviceType === 'WATER_TAX');
    const d2dcDemands = demands.filter(d => d.serviceType === 'D2DC');
    
    const totalOutstanding = demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);
    const houseTaxOutstanding = houseTaxDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);
    const waterTaxOutstanding = waterTaxDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);
    const d2dcOutstanding = d2dcDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);

    // Get recent payments
    const recentPayments = await Payment.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        status: 'completed'
      },
      include: [
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'financialYear', 'serviceType'], required: false }
      ],
      order: [['paymentDate', 'DESC']],
      limit: 5
    });

    // Get pending demands - separate by serviceType
    const pendingDemands = await Demand.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        status: { [Op.in]: ['pending', 'overdue'] },
        balanceAmount: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        { model: Assessment, as: 'assessment', attributes: ['id', 'assessmentNumber'], required: false },
        { model: WaterTaxAssessment, as: 'waterTaxAssessment', attributes: ['id', 'assessmentNumber'], required: false }
      ],
      order: [['serviceType', 'ASC'], ['dueDate', 'ASC']]
    });

    const pendingHouseTaxDemands = pendingDemands.filter(d => d.serviceType === 'HOUSE_TAX');
    const pendingWaterTaxDemands = pendingDemands.filter(d => d.serviceType === 'WATER_TAX');
    const pendingD2dcDemands = pendingDemands.filter(d => d.serviceType === 'D2DC');

    // Get active notices count (not resolved)
    const activeNotices = await Notice.count({
      where: {
        ownerId: userId,
        status: { [Op.in]: ['generated', 'sent', 'viewed'] }
      }
    });

    res.json({
      success: true,
      data: {
        properties: properties.length,
        totalOutstanding,
        houseTaxOutstanding,
        waterTaxOutstanding,
        d2dcOutstanding,
        pendingDemands: pendingDemands.length,
        pendingHouseTaxDemands: pendingHouseTaxDemands.length,
        pendingWaterTaxDemands: pendingWaterTaxDemands.length,
        pendingD2dcDemands: pendingD2dcDemands.length,
        activeNotices,
        recentPayments,
        pendingDemandsList: pendingDemands,
        pendingHouseTaxDemandsList: pendingHouseTaxDemands,
        pendingWaterTaxDemandsList: pendingWaterTaxDemands,
        pendingD2dcDemandsList: pendingD2dcDemands
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/properties
 * @desc    Get citizen's properties
 * @access  Private (Citizen)
 */
export const getCitizenProperties = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const properties = await Property.findAll({
      where: { ownerId: userId, isActive: true },
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { properties }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/demands
 * @desc    Get citizen's demands
 * @access  Private (Citizen)
 */
export const getCitizenDemands = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const properties = await Property.findAll({
      where: { ownerId: userId },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

    const where = {
      propertyId: { [Op.in]: propertyIds }
    };
    if (status) where.status = status;

    const demands = await Demand.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        { model: Assessment, as: 'assessment', attributes: ['id', 'assessmentNumber', 'assessmentYear'], required: false },
        { model: WaterTaxAssessment, as: 'waterTaxAssessment', attributes: ['id', 'assessmentNumber', 'assessmentYear'], required: false }
      ],
      order: [['serviceType', 'ASC'], ['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      data: { demands }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/payments
 * @desc    Get citizen's payment history
 * @access  Private (Citizen)
 */
export const getCitizenPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const properties = await Property.findAll({
      where: { ownerId: userId },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

    const where = {
      propertyId: { [Op.in]: propertyIds },
      status: 'completed'
    };

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) where.paymentDate[Op.lte] = new Date(endDate);
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'financialYear', 'serviceType'], required: false }
      ],
      order: [['paymentDate', 'DESC']]
    });

    res.json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/water-connections
 * @desc    Get citizen's water connections
 * @access  Private (Citizen)
 */
export const getCitizenWaterConnections = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user properties
    const properties = await Property.findAll({
      where: { ownerId: userId, isActive: true },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

    if (propertyIds.length === 0) {
      return res.json({
        success: true,
        data: { waterConnections: [] }
      });
    }

    const waterConnections = await WaterConnection.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        status: { [Op.in]: ['ACTIVE', 'DRAFT'] }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address'],
          include: [
            { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
          ]
        }
      ],
      order: [['connectionDate', 'DESC']]
    });

    res.json({
      success: true,
      data: { waterConnections }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/citizen/water-connection-requests
 * @desc    Create water connection request
 * @access  Private (Citizen)
 */
export const createWaterConnectionRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { propertyId, propertyLocation, connectionType, remarks } = req.body;

    // Validate required fields
    if (!propertyId || !propertyLocation || !connectionType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide propertyId, propertyLocation, and connectionType'
      });
    }

    // Validate connectionType
    const validTypes = ['domestic', 'commercial', 'industrial'];
    if (!validTypes.includes(connectionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid connectionType. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Verify property belongs to user
    const property = await Property.findOne({
      where: { id: propertyId, ownerId: userId, isActive: true }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or does not belong to you'
      });
    }

    // Check if there's already a pending request for this property
    const existingRequest = await WaterConnectionRequest.findOne({
      where: {
        propertyId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending water connection request for this property'
      });
    }

    // Generate request number
    const requestCount = await WaterConnectionRequest.count();
    const requestNumber = `WCR-${String(requestCount + 1).padStart(6, '0')}`;

    // Create request
    const request = await WaterConnectionRequest.create({
      requestNumber,
      propertyId,
      requestedBy: userId,
      propertyLocation,
      connectionType,
      remarks: remarks || null,
      status: 'PENDING'
    });

    // Fetch with relations
    const requestWithDetails = await WaterConnectionRequest.findByPk(request.id, {
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Water connection request submitted successfully',
      data: { request: requestWithDetails }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/water-connection-requests
 * @desc    Get citizen's water connection requests
 * @access  Private (Citizen)
 */
export const getCitizenWaterConnectionRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const requests = await WaterConnectionRequest.findAll({
      where: { requestedBy: userId },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
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
