import { PenaltyRule } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   GET /api/penalty-rules
 * @desc    Get all penalty rules
 * @access  Private (Admin, Assessor)
 */
export const getAllPenaltyRules = async (req, res, next) => {
  try {
    const { financialYear, isActive } = req.query;

    const where = {};
    if (financialYear) where.financialYear = financialYear;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rules = await PenaltyRule.findAll({
      where,
      order: [['financialYear', 'DESC'], ['effectiveFrom', 'DESC']]
    });

    res.json({
      success: true,
      data: { rules }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/penalty-rules/:id
 * @desc    Get penalty rule by ID
 * @access  Private (Admin, Assessor)
 */
export const getPenaltyRuleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await PenaltyRule.findByPk(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Penalty rule not found'
      });
    }

    res.json({
      success: true,
      data: { rule }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/penalty-rules
 * @desc    Create a new penalty rule
 * @access  Private (Admin only)
 */
export const createPenaltyRule = async (req, res, next) => {
  try {
    const {
      financialYear,
      ruleName,
      penaltyType,
      penaltyValue,
      penaltyFrequency,
      penaltyBase,
      interestType,
      interestValue,
      interestFrequency,
      interestBase,
      gracePeriodDays,
      maxPenaltyAmount,
      maxInterestAmount,
      effectiveFrom,
      effectiveTo,
      description
    } = req.body;

    // Validation
    if (!financialYear || !ruleName || !penaltyType || !penaltyValue) {
      return res.status(400).json({
        success: false,
        message: 'Financial year, rule name, penalty type, and penalty value are required'
      });
    }

    const rule = await PenaltyRule.create({
      financialYear,
      ruleName,
      penaltyType,
      penaltyValue,
      penaltyFrequency: penaltyFrequency || 'monthly',
      penaltyBase: penaltyBase || 'base_amount',
      interestType: interestType || 'percentage',
      interestValue: interestValue || 0,
      interestFrequency: interestFrequency || 'monthly',
      interestBase: interestBase || 'balance_amount',
      gracePeriodDays: gracePeriodDays || 0,
      maxPenaltyAmount,
      maxInterestAmount,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      description,
      isActive: true,
      createdBy: req.user.id
    });

    // Log creation
    await auditLogger.logCreate(
      req,
      req.user,
      'PenaltyRule',
      rule.id,
      rule.toJSON(),
      `Created penalty rule: ${rule.ruleName} for FY ${financialYear}`
    );

    res.status(201).json({
      success: true,
      message: 'Penalty rule created successfully',
      data: { rule }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/penalty-rules/:id
 * @desc    Update penalty rule
 * @access  Private (Admin only)
 */
export const updatePenaltyRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await PenaltyRule.findByPk(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Penalty rule not found'
      });
    }

    const previousData = rule.toJSON();

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        rule[key] = updateData[key];
      }
    });

    await rule.save();

    // Log update
    await auditLogger.logUpdate(
      req,
      req.user,
      'PenaltyRule',
      rule.id,
      previousData,
      rule.toJSON(),
      `Updated penalty rule: ${rule.ruleName}`
    );

    res.json({
      success: true,
      message: 'Penalty rule updated successfully',
      data: { rule }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/penalty-rules/:id
 * @desc    Delete (deactivate) penalty rule
 * @access  Private (Admin only)
 */
export const deletePenaltyRule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await PenaltyRule.findByPk(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Penalty rule not found'
      });
    }

    const previousData = rule.toJSON();

    // Soft delete by deactivating
    rule.isActive = false;
    await rule.save();

    // Log deletion
    await auditLogger.logDelete(
      req,
      req.user,
      'PenaltyRule',
      rule.id,
      previousData,
      `Deactivated penalty rule: ${rule.ruleName}`
    );

    res.json({
      success: true,
      message: 'Penalty rule deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};
