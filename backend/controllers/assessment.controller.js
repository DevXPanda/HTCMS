import { Assessment, Property, User, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   GET /api/assessments
 * @desc    Get all tax assessments (with filters)
 * @access  Private
 */
export const getAllAssessments = async (req, res, next) => {
  try {
    const { 
      propertyId, 
      assessmentYear, 
      status, 
      assessorId,
      search,
      minValue,
      maxValue,
      page = 1, 
      limit = 10 
    } = req.query;

    const where = {};
    
    if (propertyId) where.propertyId = propertyId;
    if (assessmentYear) where.assessmentYear = assessmentYear;
    if (status) where.status = status;
    if (assessorId) where.assessorId = assessorId;

    // Search by assessment number
    if (search) {
      where.assessmentNumber = { [Op.iLike]: `%${search}%` };
    }

    // Filter by assessed value range
    if (minValue || maxValue) {
      where.assessedValue = {};
      if (minValue) where.assessedValue[Op.gte] = parseFloat(minValue);
      if (maxValue) where.assessedValue[Op.lte] = parseFloat(maxValue);
    }

    // For citizens, show only assessments of their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Assessment.findAndCountAll({
      where,
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
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
 * @route   GET /api/assessments/:id
 * @desc    Get assessment by ID
 * @access  Private
 */
export const getAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findByPk(id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: { exclude: ['password'] } },
            { model: Ward, as: 'ward' }
          ]
        },
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Tax Assessment not found'
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
 * @route   POST /api/assessments
 * @desc    Create new assessment
 * @access  Private (Assessor, Admin)
 */
export const createAssessment = async (req, res, next) => {
  try {
    const {
      propertyId,
      assessmentYear,
      assessedValue,
      landValue,
      buildingValue,
      depreciation = 0,
      exemptionAmount = 0,
      taxRate,
      effectiveDate,
      expiryDate,
      remarks
    } = req.body;

    // Validation
    if (!propertyId || !assessmentYear || !assessedValue || !taxRate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: propertyId, assessmentYear, assessedValue, taxRate'
      });
    }

    // Validate property exists
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if assessment already exists for this property and year
    const existingAssessment = await Assessment.findOne({
      where: {
        propertyId,
        assessmentYear,
        status: { [Op.in]: ['draft', 'pending', 'approved'] }
      }
    });

    if (existingAssessment) {
      return res.status(400).json({
        success: false,
        message: `Assessment already exists for property ${property.propertyNumber} for year ${assessmentYear}`
      });
    }

    // Calculate annual tax amount
    const netAssessedValue = assessedValue - (depreciation || 0) - (exemptionAmount || 0);
    const annualTaxAmount = (netAssessedValue * taxRate) / 100;

    // Generate assessment number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const assessmentNumber = `ASS-${assessmentYear}-${timestamp}`;

    const assessment = await Assessment.create({
      assessmentNumber,
      propertyId,
      assessmentYear,
      assessedValue,
      landValue,
      buildingValue,
      depreciation: depreciation || 0,
      exemptionAmount: exemptionAmount || 0,
      taxRate,
      annualTaxAmount,
      effectiveDate: effectiveDate || new Date(),
      expiryDate,
      assessorId: req.user.id,
      status: 'draft',
      remarks
    });

    const createdAssessment = await Assessment.findByPk(assessment.id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    // Log assessment creation
    await auditLogger.logCreate(
      req,
      req.user,
      'Assessment',
      assessment.id,
      { assessmentNumber: assessment.assessmentNumber, propertyId: assessment.propertyId, status: assessment.status },
      `Created assessment: ${assessment.assessmentNumber}`,
      { propertyId: assessment.propertyId }
    );

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: { assessment: createdAssessment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/assessments/:id
 * @desc    Update assessment
 * @access  Private (Assessor, Admin)
 */
export const updateAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      assessedValue, 
      landValue,
      buildingValue,
      depreciation,
      exemptionAmount,
      taxRate, 
      effectiveDate,
      expiryDate,
      remarks 
    } = req.body;

    const assessment = await Assessment.findByPk(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Tax Assessment not found'
      });
    }

    // Only allow updates if status is draft or pending
    if (assessment.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update approved assessment. Create a new revision instead.'
      });
    }

    // Capture previous data for audit log
    const previousData = {
      assessedValue: assessment.assessedValue,
      taxRate: assessment.taxRate,
      status: assessment.status,
      revisionNumber: assessment.revisionNumber
    };

    // Update fields
    if (assessedValue !== undefined) assessment.assessedValue = assessedValue;
    if (landValue !== undefined) assessment.landValue = landValue;
    if (buildingValue !== undefined) assessment.buildingValue = buildingValue;
    if (depreciation !== undefined) assessment.depreciation = depreciation;
    if (exemptionAmount !== undefined) assessment.exemptionAmount = exemptionAmount;
    if (taxRate !== undefined) assessment.taxRate = taxRate;
    if (effectiveDate !== undefined) assessment.effectiveDate = effectiveDate;
    if (expiryDate !== undefined) assessment.expiryDate = expiryDate;
    if (remarks !== undefined) assessment.remarks = remarks;

    // Recalculate annual tax amount if values changed
    const finalAssessedValue = assessment.assessedValue;
    const finalDepreciation = assessment.depreciation || 0;
    const finalExemption = assessment.exemptionAmount || 0;
    const finalTaxRate = assessment.taxRate;
    const netAssessedValue = finalAssessedValue - finalDepreciation - finalExemption;
    assessment.annualTaxAmount = (netAssessedValue * finalTaxRate) / 100;

    // Increment revision number if significant changes made
    if (assessedValue || taxRate || depreciation || exemptionAmount) {
      assessment.revisionNumber = (assessment.revisionNumber || 0) + 1;
    }

    await assessment.save();

    // Log assessment update
    const newData = {
      assessedValue: assessment.assessedValue,
      taxRate: assessment.taxRate,
      status: assessment.status,
      revisionNumber: assessment.revisionNumber
    };
    await auditLogger.logUpdate(
      req,
      req.user,
      'Assessment',
      assessment.id,
      previousData,
      newData,
      `Updated assessment: ${assessment.assessmentNumber}`,
      { propertyId: assessment.propertyId }
    );

    const updatedAssessment = await Assessment.findByPk(id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.json({
      success: true,
      message: 'Assessment updated successfully',
      data: { assessment: updatedAssessment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/assessments/:id/approve
 * @desc    Approve assessment
 * @access  Private (Admin only)
 */
export const approveAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const assessment = await Assessment.findByPk(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Tax Assessment not found'
      });
    }

    const previousData = { status: assessment.status };
    assessment.status = 'approved';
    assessment.approvedBy = req.user.id;
    assessment.approvalDate = new Date();
    if (remarks) assessment.remarks = remarks;

    await assessment.save();

    // Log assessment approval
    await auditLogger.logApprove(
      req,
      req.user,
      'Assessment',
      assessment.id,
      previousData,
      { status: assessment.status, approvedBy: req.user.id },
      `Approved assessment: ${assessment.assessmentNumber}`,
      { propertyId: assessment.propertyId }
    );

    res.json({
      success: true,
      message: 'Assessment approved successfully',
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/assessments/:id/reject
 * @desc    Reject assessment
 * @access  Private (Admin only)
 */
export const rejectAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Remarks are required for rejection'
      });
    }

    const assessment = await Assessment.findByPk(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Tax Assessment not found'
      });
    }

    const previousData = { status: assessment.status };
    assessment.status = 'rejected';
    assessment.remarks = remarks;

    await assessment.save();

    // Log assessment rejection
    await auditLogger.logReject(
      req,
      req.user,
      'Assessment',
      assessment.id,
      previousData,
      { status: assessment.status },
      `Rejected assessment: ${assessment.assessmentNumber}`,
      { propertyId: assessment.propertyId, rejectionRemarks: remarks }
    );

    res.json({
      success: true,
      message: 'Assessment rejected',
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/assessments/:id/submit
 * @desc    Submit assessment for approval
 * @access  Private (Assessor, Admin)
 */
export const submitAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findByPk(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Tax Assessment not found'
      });
    }

    if (assessment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot submit assessment with status: ${assessment.status}`
      });
    }

    assessment.status = 'pending';
    await assessment.save();

    res.json({
      success: true,
      message: 'Assessment submitted for approval',
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/assessments/property/:propertyId
 * @desc    Get all assessments for a property
 * @access  Private
 */
export const getAssessmentsByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const assessments = await Assessment.findAll({
      where: { propertyId },
      include: [
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['assessmentYear', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { assessments }
    });
  } catch (error) {
    next(error);
  }
};
