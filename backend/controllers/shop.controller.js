import { Shop, Property, Ward, User } from '../models/index.js';
import { Op } from 'sequelize';
import { generateShopId } from '../services/uniqueIdService.js';
import { getEffectiveUlbForRequest, getWardIdsByUlbId } from '../utils/ulbAccessHelper.js';

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
 *
 * @route   GET /api/shops
 * @desc    List shops (ward-filtered for clerk/inspector/collector)
 * @access  Private
 */
export const getAllShops = async (req, res, next) => {
  try {
    const { wardId, propertyId, status, shopType, search, page = 1, limit = 10 } = req.query;
    const where = {};
    const { isSuperAdmin, effectiveUlbId } = getEffectiveUlbForRequest(req);

    if (wardId) where.wardId = wardId;
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (shopType) where.shopType = shopType;
    if (search) {
      where[Op.or] = [
        { shopNumber: { [Op.iLike]: `%${search}%` } },
        { shopName: { [Op.iLike]: `%${search}%` } },
        { contactName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    applyWardFilter(req, where);

    // ULB filter for non-citizen (admin/assessor/cashier/clerk etc.)
    if (req.user.role !== 'citizen') {
      if (!isSuperAdmin && (effectiveUlbId == null || effectiveUlbId === '')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must be assigned to an ULB to view shops.'
        });
      }
      if (effectiveUlbId) {
        const ulbWardIds = await getWardIdsByUlbId(effectiveUlbId);
        if (!ulbWardIds || ulbWardIds.length === 0) {
          return res.json({
            success: true,
            data: { shops: [], pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 } }
          });
        }
        const existingWardFilter = where.wardId;
        if (existingWardFilter && (existingWardFilter[Op.in] || Array.isArray(existingWardFilter))) {
          const existingIds = existingWardFilter[Op.in] ?? existingWardFilter;
          const ids = Array.isArray(existingIds) ? existingIds : [existingIds];
          where.wardId = { [Op.in]: ids.filter((id) => ulbWardIds.includes(Number(id))) };
        } else {
          where.wardId = { [Op.in]: ulbWardIds };
        }
      }
    }

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
      if (allowedWardIds && allowedWardIds.length > 0) {
        if (!allowedWardIds.includes(shop.wardId)) {
          return res.status(403).json({ success: false, message: 'Access denied to this ward' });
        }
      } else {
        // ULB isolation: non–super-admin can only view shops in their assigned ULB
        const { isSuperAdmin, effectiveUlbId } = getEffectiveUlbForRequest(req);
        if (!isSuperAdmin && effectiveUlbId) {
          const ward = shop.ward || await Ward.findByPk(shop.wardId, { attributes: ['ulb_id'] });
          if (!ward || ward.ulb_id !== effectiveUlbId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. Shop does not belong to your assigned ULB.'
            });
          }
        }
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
    if (!req.file || !req.file.filename) {
      return res.status(400).json({
        success: false,
        message: 'Trade license document (image or PDF) is required'
      });
    }

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
      ownerPhotoUrl,
      tradeLicenseNumber,
      licenseValidFrom,
      licenseValidTo,
      licenseStatus,
      remarks
    } = req.body;

    if (!propertyId || !wardId || !shopName) {
      return res.status(400).json({
        success: false,
        message: 'propertyId, wardId and shopName are required'
      });
    }

    const parsedWardId = parseInt(wardId, 10);
    const shopNumber = await generateShopId(parsedWardId);

    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && !allowedWardIds.includes(parsedWardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.wardId !== parsedWardId) {
      return res.status(400).json({ success: false, message: 'Property ward must match wardId' });
    }

    const licenseDocumentUrl = `/uploads/shop-licenses/${req.file.filename}`;

    const shop = await Shop.create({
      shopNumber,
      propertyId,
      wardId: parsedWardId,
      ownerId: ownerId || null,
      shopName,
      shopType: shopType || 'retail',
      category: category || null,
      area: area || null,
      address: address || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      tradeLicenseNumber: tradeLicenseNumber || null,
      licenseValidFrom: licenseValidFrom || null,
      licenseValidTo: licenseValidTo || null,
      licenseStatus: licenseStatus || null,
      licenseDocumentUrl,
      ownerPhotoUrl: ownerPhotoUrl && String(ownerPhotoUrl).trim() ? String(ownerPhotoUrl).trim() : null,
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
    console.error('Create shop error:', error?.message || error);
    if (error.name === 'SequelizeUniqueConstraintError' && error.fields && error.fields.shopNumber) {
      return res.status(409).json({
        success: false,
        message: 'Shop number already exists',
        code: 'DUPLICATE_SHOP_NUMBER'
      });
    }
    if (error.name === 'SequelizeDatabaseError' || (error.original && String(error.original?.message || '').includes('does not exist'))) {
      return res.status(503).json({
        success: false,
        message: 'Database schema may be out of date. Please run: node sync-db.js (from backend folder) and try again.'
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

    const allowed = ['shopName', 'shopType', 'category', 'area', 'address', 'contactName', 'contactPhone', 'tradeLicenseNumber', 'licenseValidFrom', 'licenseValidTo', 'licenseStatus', 'licenseDocumentUrl', 'status', 'isActive', 'remarks'];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // Prevent clerk from closing shops (admin only)
    if (req.user.role === 'clerk' && updates.status === 'closed') {
      return res.status(403).json({
        success: false,
        message: 'Clerks cannot close shops. Only administrators can close shops.'
      });
    }

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
