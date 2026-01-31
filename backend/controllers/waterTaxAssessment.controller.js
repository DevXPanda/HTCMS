import { WaterTaxAssessment, Property, WaterConnection, User, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { validatePropertyId } from '../utils/queryHelpers.js';

/**
 * Generate unique assessment number
 */
const generateAssessmentNumber = async (assessmentYear) => {
  const year = new Date().getFullYear();
  const count = await WaterTaxAssessment.count({
    where: {
      assessmentNumber: {
        [Op.like]: `WTA-${assessmentYear}-%`
      }
    }
  });
  const sequence = String(count + 1).padStart(6, '0');
  return `WTA-${assessmentYear}-${sequence}`;
};

/**
 * @route   GET /api/water-tax-assessments
 * @desc    Get all water tax assessments (with filters)
 * @access  Private
 */
export const getAllWaterTaxAssessments = async (req, res, next) => {
  try {
    const { 
      waterConnectionId,
      assessmentYear, 
      assessmentType,
      status,
      search,
      minValue,
      maxValue,
      page = 1, 
      limit = 10 
    } = req.query;

    // Safely extract and validate propertyId
    let validPropertyId = null;
    if (req.query.propertyId) {
      try {
        validPropertyId = validatePropertyId(req.query, 'propertyId');
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    const where = {};
    
    if (validPropertyId) where.propertyId = validPropertyId;
    if (waterConnectionId) where.waterConnectionId = waterConnectionId;
    if (assessmentYear) where.assessmentYear = assessmentYear;
    if (assessmentType) where.assessmentType = assessmentType;
    if (status) where.status = status;

    // Search by assessment number
    if (search) {
      where.assessmentNumber = { [Op.iLike]: `%${search}%` };
    }

    // For citizens, show only assessments of their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      if (propertyIds.length > 0) {
        where.propertyId = { [Op.in]: propertyIds };
      } else {
        // No properties, return empty
        return res.json({
          success: true,
          data: {
            assessments: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await WaterTaxAssessment.findAndCountAll({
      where,
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
          ]
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'connectionType', 'isMetered', 'meterNumber']
        },
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        assessments: rows,
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
 * @route   GET /api/water-tax-assessments/:id
 * @desc    Get water tax assessment by ID
 * @access  Private
 */
export const getWaterTaxAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await WaterTaxAssessment.findByPk(id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: { exclude: ['password'] } },
            { model: Ward, as: 'ward' }
          ]
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'connectionType', 'isMetered', 'meterNumber', 'status']
        },
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Water Tax Assessment not found'
      });
    }

    // Check access for citizens
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(assessment.propertyId);
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/water-tax-assessments
 * @desc    Create new water tax assessment
 * @access  Private
 */
export const createWaterTaxAssessment = async (req, res, next) => {
  try {
    // Support both snake_case and camelCase
    const {
      propertyId,
      property_id,
      waterConnectionId,
      water_connection_id,
      assessmentYear,
      assessment_year,
      assessmentType,
      assessment_type,
      rate,
      remarks
    } = req.body;

    // Normalize to camelCase
    const normalizedPropertyId = propertyId || property_id;
    const normalizedWaterConnectionId = waterConnectionId || water_connection_id;
    const normalizedAssessmentYear = assessmentYear || assessment_year;
    const normalizedAssessmentType = assessmentType || assessment_type;

    // Validation
    const missingFields = [];
    if (!normalizedPropertyId) missingFields.push('property_id');
    if (!normalizedWaterConnectionId) missingFields.push('water_connection_id');
    if (!normalizedAssessmentYear) missingFields.push('assessment_year');
    if (!normalizedAssessmentType) missingFields.push('assessment_type');
    if (!rate) missingFields.push('rate');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate assessment type
    if (!['METERED', 'FIXED'].includes(normalizedAssessmentType)) {
      return res.status(400).json({
        success: false,
        message: 'assessment_type must be either METERED or FIXED'
      });
    }

    // Validate property exists and is active
    const property = await Property.findByPk(normalizedPropertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Prevent assessment generation for inactive properties
    if (property.isActive === false) {
      return res.status(400).json({
        success: false,
        message: `Cannot create water tax assessment for inactive property ${property.propertyNumber || normalizedPropertyId}. Property must be active to receive assessments.`
      });
    }

    // Validate water connection exists and belongs to property
    const waterConnection = await WaterConnection.findOne({
      where: {
        id: normalizedWaterConnectionId,
        propertyId: normalizedPropertyId
      }
    });

    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found or does not belong to the specified property'
      });
    }

    // Check if assessment already exists for this connection and year
    const existingAssessment = await WaterTaxAssessment.findOne({
      where: {
        waterConnectionId: normalizedWaterConnectionId,
        assessmentYear: normalizedAssessmentYear,
        status: { [Op.in]: ['draft', 'pending', 'approved'] }
      }
    });

    if (existingAssessment) {
      return res.status(400).json({
        success: false,
        message: `Assessment already exists for water connection ${waterConnection.connectionNumber} for year ${normalizedAssessmentYear}`
      });
    }

    // Generate assessment number
    const assessmentNumber = await generateAssessmentNumber(normalizedAssessmentYear);

    const assessment = await WaterTaxAssessment.create({
      assessmentNumber,
      propertyId: parseInt(normalizedPropertyId),
      waterConnectionId: parseInt(normalizedWaterConnectionId),
      assessmentYear: parseInt(normalizedAssessmentYear),
      assessmentType: normalizedAssessmentType,
      rate: parseFloat(rate),
      remarks: remarks || null,
      assessorId: req.user?.id || null,
      status: 'draft'
    });

    const createdAssessment = await WaterTaxAssessment.findByPk(assessment.id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
          ]
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'connectionType', 'isMetered', 'meterNumber']
        },
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Water tax assessment created successfully',
      data: { assessment: createdAssessment }
    });
  } catch (error) {
    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Assessment number already exists'
      });
    }
    next(error);
  }
};
