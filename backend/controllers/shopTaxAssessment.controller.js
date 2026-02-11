import { ShopTaxAssessment, Shop, Property, Ward, User } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Apply ward filter via shop.wardId (where on included Shop)
 */
const applyWardFilter = (req, where) => {
  if (req.wardFilter && req.wardFilter.id) {
    where['$shop.wardId$'] = req.wardFilter.id;
  }
};

const getAllowedWardIds = (req) => {
  if (!req.wardFilter || !req.wardFilter.id) return null;
  const id = req.wardFilter.id;
  if (id && typeof id === 'object' && id[Op.in]) return id[Op.in];
  if (Array.isArray(id)) return id;
  return [id];
};

/**
 * Generate unique shop tax assessment number
 */
const generateAssessmentNumber = async (assessmentYear) => {
  const count = await ShopTaxAssessment.count({
    where: { assessmentNumber: { [Op.like]: `STA-${assessmentYear}-%` } }
  });
  const sequence = String(count + 1).padStart(5, '0');
  return `STA-${assessmentYear}-${sequence}`;
};

/**
 * @route   GET /api/shop-tax-assessments
 * @desc    List shop tax assessments (ward-filtered for staff)
 * @access  Private
 */
export const getAllShopTaxAssessments = async (req, res, next) => {
  try {
    const { shopId, wardId, status, assessmentYear, page = 1, limit = 10 } = req.query;
    const where = {};

    if (shopId) where.shopId = shopId;
    if (status) where.status = status;
    if (assessmentYear) where.assessmentYear = assessmentYear;

    const shopWhere = {};
    if (wardId) shopWhere.wardId = wardId;
    if (req.wardFilter && req.wardFilter.id) shopWhere.wardId = req.wardFilter.id;

    const include = [
      {
        model: Shop,
        as: 'shop',
        attributes: ['id', 'shopNumber', 'shopName', 'propertyId', 'wardId', 'status'],
        ...(Object.keys(shopWhere).length ? { where: shopWhere } : {}),
        required: true,
        include: [
          { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] },
          { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
        ]
      },
      { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'], required: false },
      { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'], required: false }
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await ShopTaxAssessment.findAndCountAll({
      where,
      include,
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
 * @route   GET /api/shop-tax-assessments/:id
 * @desc    Get shop tax assessment by ID
 * @access  Private
 */
export const getShopTaxAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assessment = await ShopTaxAssessment.findByPk(id, {
      include: [
        {
          model: Shop,
          as: 'shop',
          include: [
            { model: Property, as: 'property', include: [{ model: Ward, as: 'ward' }, { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }] },
            { model: Ward, as: 'ward' }
          ]
        },
        { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'], required: false }
      ]
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Shop tax assessment not found' });
    }

    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && assessment.shop && !allowedWardIds.includes(assessment.shop.wardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    res.json({ success: true, data: { assessment } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shop-tax-assessments
 * @desc    Create shop tax assessment (duplicate: one per shop per year; shop closed validation)
 * @access  Private (Admin, Assessor, Clerk)
 */
export const createShopTaxAssessment = async (req, res, next) => {
  try {
    const { shopId, assessmentYear, financialYear, assessedValue, rate, annualTaxAmount, remarks } = req.body;

    if (!shopId || !assessmentYear || annualTaxAmount == null) {
      return res.status(400).json({
        success: false,
        message: 'shopId, assessmentYear and annualTaxAmount are required'
      });
    }

    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Shop closed validation: do not allow new assessment for closed shop
    if (shop.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create assessment for a closed shop'
      });
    }

    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && !allowedWardIds.includes(shop.wardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    // Duplicate protection: one assessment per shop per assessment year
    const existing = await ShopTaxAssessment.findOne({
      where: { shopId, assessmentYear }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `An assessment for this shop already exists for year ${assessmentYear}`,
        code: 'DUPLICATE_SHOP_ASSESSMENT'
      });
    }

    const assessmentNumber = await generateAssessmentNumber(assessmentYear);
    const fy = financialYear || `${assessmentYear}-${String(assessmentYear + 1).slice(-2)}`;

    const assessment = await ShopTaxAssessment.create({
      assessmentNumber,
      shopId,
      assessmentYear,
      financialYear: fy,
      assessedValue: assessedValue || null,
      rate: rate || null,
      annualTaxAmount: parseFloat(annualTaxAmount),
      status: 'draft',
      assessorId: req.user.id,
      remarks: remarks || null
    });

    const created = await ShopTaxAssessment.findByPk(assessment.id, {
      include: [
        { model: Shop, as: 'shop', include: [{ model: Property, as: 'property' }, { model: Ward, as: 'ward' }] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Shop tax assessment created successfully',
      data: { assessment: created }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'An assessment for this shop and year already exists',
        code: 'DUPLICATE_SHOP_ASSESSMENT'
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/shop-tax-assessments/:id
 * @desc    Update shop tax assessment (draft only)
 * @access  Private (Admin, Assessor, Clerk)
 */
export const updateShopTaxAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assessment = await ShopTaxAssessment.findByPk(id, {
      include: [{ model: Shop, as: 'shop' }]
    });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Shop tax assessment not found' });
    }
    if (assessment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft assessments can be updated'
      });
    }

    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && assessment.shop && !allowedWardIds.includes(assessment.shop.wardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    const allowed = ['financialYear', 'assessedValue', 'rate', 'annualTaxAmount', 'remarks'];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    if (updates.annualTaxAmount !== undefined) updates.annualTaxAmount = parseFloat(updates.annualTaxAmount);

    await assessment.update(updates);
    const updated = await ShopTaxAssessment.findByPk(assessment.id, {
      include: [{ model: Shop, as: 'shop', include: [{ model: Property, as: 'property' }, { model: Ward, as: 'ward' }] }]
    });

    res.json({
      success: true,
      message: 'Shop tax assessment updated successfully',
      data: { assessment: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shop-tax-assessments/:id/submit
 * @desc    Submit for approval (draft -> pending)
 * @access  Private (Admin, Assessor, Clerk)
 */
export const submitShopTaxAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assessment = await ShopTaxAssessment.findByPk(id, { include: [{ model: Shop, as: 'shop' }] });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Shop tax assessment not found' });
    }
    if (assessment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft assessments can be submitted'
      });
    }

    if (assessment.shop && assessment.shop.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit assessment for a closed shop'
      });
    }

    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && assessment.shop && !allowedWardIds.includes(assessment.shop.wardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    await assessment.update({ status: 'pending' });
    const updated = await ShopTaxAssessment.findByPk(assessment.id, {
      include: [{ model: Shop, as: 'shop', include: [{ model: Property, as: 'property' }, { model: Ward, as: 'ward' }] }]
    });

    res.json({
      success: true,
      message: 'Assessment submitted for approval',
      data: { assessment: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shop-tax-assessments/:id/approve
 * @desc    Approve assessment (Admin; optional Officer)
 * @access  Private (Admin)
 */
export const approveShopTaxAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assessment = await ShopTaxAssessment.findByPk(id, { include: [{ model: Shop, as: 'shop' }] });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Shop tax assessment not found' });
    }
    if (assessment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending assessments can be approved'
      });
    }

    await assessment.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvalDate: new Date()
    });
    const updated = await ShopTaxAssessment.findByPk(assessment.id, {
      include: [{ model: Shop, as: 'shop', include: [{ model: Property, as: 'property' }, { model: Ward, as: 'ward' }] }]
    });

    res.json({
      success: true,
      message: 'Assessment approved successfully',
      data: { assessment: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shop-tax-assessments/:id/reject
 * @desc    Reject assessment (Admin)
 * @access  Private (Admin)
 */
export const rejectShopTaxAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const assessment = await ShopTaxAssessment.findByPk(id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Shop tax assessment not found' });
    }
    if (assessment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending assessments can be rejected'
      });
    }

    await assessment.update({ status: 'rejected', remarks: remarks || assessment.remarks });
    const updated = await ShopTaxAssessment.findByPk(assessment.id, {
      include: [{ model: Shop, as: 'shop', include: [{ model: Property, as: 'property' }, { model: Ward, as: 'ward' }] }]
    });

    res.json({
      success: true,
      message: 'Assessment rejected',
      data: { assessment: updated }
    });
  } catch (error) {
    next(error);
  }
};
