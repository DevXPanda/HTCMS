import { Shop, Property, Ward, User } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Apply ward filter to where clause for clerk/inspector/collector (from req.wardFilter set by requireWardAccess)
 * req.wardFilter is { id: { [Op.in]: wardIds } }
 */
const applyWardFilter = (req, where) => {
  if (req.wardFilter && req.wardFilter.id) {
    where.wardId = req.wardFilter.id;
  }
};

const getAllowedWardIds = (req) => {
  if (!req.wardFilter || !req.wardFilter.id) return null;
  const id = req.wardFilter.id;
  if (id[Op.in]) return id[Op.in];
  if (Array.isArray(id)) return id;
  return [id];
};

/**
 * Generate unique shop number
 */
const generateShopNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Shop.count({
    where: {
      shopNumber: { [Op.like]: `SH-${year}-%` }
    }
  });
  const sequence = String(count + 1).padStart(5, '0');
  return `SH-${year}-${sequence}`;
};

/**
 * @route   GET /api/shops
 * @desc    List shops (ward-filtered for clerk/inspector/collector)
 * @access  Private
 */
export const getAllShops = async (req, res, next) => {
  try {
    const { wardId, propertyId, status, search, page = 1, limit = 10 } = req.query;
    const where = {};

    if (wardId) where.wardId = wardId;
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { shopNumber: { [Op.iLike]: `%${search}%` } },
        { shopName: { [Op.iLike]: `%${search}%` } },
        { contactName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    applyWardFilter(req, where);

    // Citizen: only shops linked to their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      if (propertyIds.length === 0) {
        return res.json({
          success: true,
          data: { shops: [], pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 } }
        });
      }
      where.propertyId = { [Op.in]: propertyIds };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Shop.findAndCountAll({
      where,
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'wardId'] },
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'], required: false }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        shops: rows,
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
 * @route   GET /api/shops/:id
 * @desc    Get shop by ID (ward check for staff; citizen: own property only)
 * @access  Private
 */
export const getShopById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByPk(id, {
      include: [
        { model: Property, as: 'property', include: [{ model: Ward, as: 'ward' }, { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }] },
        { model: Ward, as: 'ward' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'], required: false }
      ]
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (req.user.role === 'citizen') {
      const prop = await Property.findByPk(shop.propertyId);
      if (!prop || prop.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else {
      const allowedWardIds = getAllowedWardIds(req);
      if (allowedWardIds && !allowedWardIds.includes(shop.wardId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this ward' });
      }
    }

    res.json({ success: true, data: { shop } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shops
 * @desc    Create shop (duplicate protection: shopNumber unique)
 * @access  Private (Admin, Clerk)
 */
export const createShop = async (req, res, next) => {
  try {
    const {
      propertyId,
      wardId,
      ownerId,
      shopName,
      shopType,
      category,
      area,
      address,
      contactName,
      contactPhone,
      remarks,
      shopNumber: bodyShopNumber
    } = req.body;

    if (!propertyId || !wardId || !shopName) {
      return res.status(400).json({
        success: false,
        message: 'propertyId, wardId and shopName are required'
      });
    }

    // Duplicate protection: unique shopNumber (allow optional override from body, else generate)
    const shopNumber = (bodyShopNumber && String(bodyShopNumber).trim()) || (await generateShopNumber());
    const existingByNumber = await Shop.findOne({ where: { shopNumber } });
    if (existingByNumber) {
      return res.status(409).json({
        success: false,
        message: `Shop number already exists: ${shopNumber}`,
        code: 'DUPLICATE_SHOP_NUMBER'
      });
    }

    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && !allowedWardIds.includes(parseInt(wardId))) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.wardId !== parseInt(wardId)) {
      return res.status(400).json({ success: false, message: 'Property ward must match wardId' });
    }

    const shop = await Shop.create({
      shopNumber,
      propertyId,
      wardId,
      ownerId: ownerId || null,
      shopName,
      shopType: shopType || 'retail',
      category: category || null,
      area: area || null,
      address: address || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      status: 'active',
      isActive: true,
      remarks: remarks || null,
      createdBy: req.user.id
    });

    const created = await Shop.findByPk(shop.id, {
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] },
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Shop created successfully',
      data: { shop: created }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError' && error.fields && error.fields.shopNumber) {
      return res.status(409).json({
        success: false,
        message: 'Shop number already exists',
        code: 'DUPLICATE_SHOP_NUMBER'
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/shops/:id
 * @desc    Update shop (ward check; no new assessments if closed - enforced in assessment/demand layer)
 * @access  Private (Admin, Clerk)
 */
export const updateShop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByPk(id);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && !allowedWardIds.includes(shop.wardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    const allowed = ['shopName', 'shopType', 'category', 'area', 'address', 'contactName', 'contactPhone', 'status', 'isActive', 'remarks'];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    await shop.update(updates);
    const updated = await Shop.findByPk(shop.id, {
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] },
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ]
    });

    res.json({
      success: true,
      message: 'Shop updated successfully',
      data: { shop: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/shops/property/:propertyId
 * @desc    List shops by property (citizen: own property only)
 * @access  Private
 */
export const getShopsByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(propertyId);
      if (!property || property.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const shops = await Shop.findAll({
      where: { propertyId },
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'], required: false }
      ],
      order: [['shopNumber', 'ASC']]
    });

    res.json({ success: true, data: { shops } });
  } catch (error) {
    next(error);
  }
};
