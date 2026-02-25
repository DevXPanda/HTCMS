import { ShopRegistrationRequest, Property, User, Shop, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';
import { generateShopId } from '../services/uniqueIdService.js';

/**
 * Generate unique request number
 */
const generateRequestNumber = async () => {
  const year = new Date().getFullYear();
  const count = await ShopRegistrationRequest.count({
    where: {
      requestNumber: { [Op.like]: `SRR-${year}-%` }
    }
  });
  const sequence = String(count + 1).padStart(5, '0');
  return `SRR-${year}-${sequence}`;
};

/**
 * Get allowed ward IDs for clerk/admin from req.wardFilter
 * req.wardFilter is set by requireWardAccess middleware
 * Normalizes all IDs to integers for consistent comparison
 */
const getAllowedWardIds = (req) => {
  // Get from req.wardFilter (set by requireWardAccess middleware)
  if (req.wardFilter && req.wardFilter.id) {
    const id = req.wardFilter.id;
    let wardIds = null;

    if (id[Op.in]) {
      wardIds = id[Op.in];
    } else if (Array.isArray(id)) {
      wardIds = id;
    } else {
      wardIds = [id];
    }

    // Normalize all ward IDs to integers for consistent database comparison
    if (wardIds && Array.isArray(wardIds)) {
      return wardIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    }
  }

  // Fallback: get from user.ward_ids (from JWT token) if wardFilter not set
  if (req.user && req.user.ward_ids && Array.isArray(req.user.ward_ids) && req.user.ward_ids.length > 0) {
    return req.user.ward_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  }

  return null;
};

/**
 * @route   GET /api/shop-registration-requests
 * @desc    Get all shop registration requests (ward-filtered for clerk)
 * @access  Private
 */
export const getAllShopRegistrationRequests = async (req, res, next) => {
  try {
    const { status, propertyId, page = 1, limit = 10 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;

    // ============================================
    // ROLE-BASED ACCESS CONTROL
    // ============================================

    // Citizen: only own requests (filtered by applicantId)
    if (req.user.role === 'citizen') {
      where.applicantId = req.user.id;

    }

    // Build Property include - ALWAYS join Property to access wardId
    const propertyInclude = {
      model: Property,
      as: 'property',
      required: true, // Shop registration request MUST have a property
      include: [{
        model: Ward,
        as: 'ward',
        attributes: ['id', 'wardNumber', 'wardName'],
        required: false
      }]
    };

    // Admin: sees ALL requests (no ward filtering)
    if (req.user.role === 'admin') {

      // No propertyInclude.where - admin sees all
    }
    // Clerk: sees ONLY requests from their assigned wards
    else if (req.user.role === 'clerk') {
      const allowedWardIds = getAllowedWardIds(req);



      if (!allowedWardIds || allowedWardIds.length === 0) {

        return res.json({
          success: true,
          data: {
            requests: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }

      // Filter by Property.wardId IN allowedWardIds
      propertyInclude.where = {
        wardId: {
          [Op.in]: allowedWardIds
        }
      };

    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build includes array
    const includes = [
      propertyInclude,
      { model: User, as: 'applicant', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'], required: true },
      { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'], required: false },
      { model: Shop, as: 'shop', required: false, attributes: ['id', 'shopNumber', 'shopName'] }
    ];

    const { count, rows } = await ShopRegistrationRequest.findAndCountAll({
      where,
      include: includes,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true // Important for count with includes
    });



    res.json({
      success: true,
      data: {
        requests: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in getAllShopRegistrationRequests:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    next(error);
  }
};

/**
 * @route   GET /api/shop-registration-requests/:id
 * @desc    Get shop registration request by ID
 * @access  Private
 */
export const getShopRegistrationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await ShopRegistrationRequest.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: Ward, as: 'ward' }, { model: User, as: 'owner' }]
        },
        { model: User, as: 'applicant', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: Shop, as: 'shop', required: false }
      ]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Shop registration request not found' });
    }

    // Citizen: only own requests
    if (req.user.role === 'citizen' && request.applicantId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Clerk: ward check - must have access to the property's ward
    if (req.user.role === 'clerk') {
      const allowedWardIds = getAllowedWardIds(req);
      if (!allowedWardIds || allowedWardIds.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied. No wards assigned to clerk.' });
      }
      // Normalize ward ID comparison
      const requestWardId = request.property ? parseInt(request.property.wardId, 10) : null;
      const normalizedAllowedWardIds = allowedWardIds.map(id => parseInt(id, 10));

      if (!request.property || !requestWardId || !normalizedAllowedWardIds.includes(requestWardId)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Request is in ward ${requestWardId || 'unknown'}, but you only have access to wards [${normalizedAllowedWardIds.join(', ')}]`
        });
      }
    } else {
      // Admin with ward filter: check ward access
      const allowedWardIds = getAllowedWardIds(req);
      if (allowedWardIds && allowedWardIds.length > 0 && request.property) {
        const requestWardId = parseInt(request.property.wardId, 10);
        const normalizedAllowedWardIds = allowedWardIds.map(id => parseInt(id, 10));
        if (!normalizedAllowedWardIds.includes(requestWardId)) {
          return res.status(403).json({ success: false, message: 'Access denied to this ward' });
        }
      }
    }

    res.json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shop-registration-requests
 * @desc    Create shop registration request (Citizen)
 * @access  Private (Citizen)
 */
export const createShopRegistrationRequest = async (req, res, next) => {
  try {
    const {
      propertyId,
      shopName,
      shopType,
      category,
      area,
      address,
      tradeLicenseNumber,
      documents,
      remarks
    } = req.body;

    // Validation
    if (!propertyId || !shopName || !shopType) {
      return res.status(400).json({
        success: false,
        message: 'propertyId, shopName, and shopType are required'
      });
    }

    // Verify property exists and citizen owns it
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (req.user.role === 'citizen' && property.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only apply for shop registration on your own properties'
      });
    }

    // Check for duplicate pending request (same property + shopName)
    const existingPending = await ShopRegistrationRequest.findOne({
      where: {
        propertyId,
        shopName,
        status: 'pending'
      }
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'A pending shop registration request already exists for this shop name on this property',
        code: 'DUPLICATE_REQUEST'
      });
    }

    // Validate and format documents array
    let formattedDocuments = [];
    if (documents) {
      if (Array.isArray(documents)) {
        formattedDocuments = documents.map(doc => ({
          fileName: doc.fileName || doc.filename,
          originalName: doc.originalName || doc.originalname,
          url: doc.url,
          size: doc.size,
          mimetype: doc.mimetype || doc.mimeType
        })).filter(doc => doc.fileName && doc.url); // Only include valid documents
      } else if (typeof documents === 'object') {
        // Handle single document object
        formattedDocuments = [{
          fileName: documents.fileName || documents.filename,
          originalName: documents.originalName || documents.originalname,
          url: documents.url,
          size: documents.size,
          mimetype: documents.mimetype || documents.mimeType
        }].filter(doc => doc.fileName && doc.url);
      }
    }

    const requestNumber = await generateRequestNumber();
    const request = await ShopRegistrationRequest.create({
      requestNumber,
      propertyId,
      applicantId: req.user.id,
      shopName,
      shopType,
      category: category || null,
      area: area ? parseFloat(area) : null,
      address: address || null,
      tradeLicenseNumber: tradeLicenseNumber || null,
      documents: formattedDocuments,
      status: 'pending',
      remarks: remarks || null
    });

    const created = await ShopRegistrationRequest.findByPk(request.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: Ward, as: 'ward' }]
        },
        { model: User, as: 'applicant', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    // Audit log
    await auditLogger.createAuditLog({
      req,
      user: req.user,
      actionType: 'CREATE',
      entityType: 'ShopRegistrationRequest',
      entityId: request.id,
      description: `Created shop registration request: ${requestNumber}`,
      metadata: { requestNumber, propertyId, shopName }
    });

    res.status(201).json({
      success: true,
      message: 'Shop registration request created successfully',
      data: { request: created }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shop-registration-requests/:id/approve
 * @desc    Approve shop registration request and create Shop record
 * @access  Private (Admin, Clerk)
 */
export const approveShopRegistrationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    const request = await ShopRegistrationRequest.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: Ward, as: 'ward' }]
        },
        { model: User, as: 'applicant' }
      ]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Shop registration request not found' });
    }

    // Clerk: ward check - must have access to the property's ward
    if (req.user.role === 'clerk') {
      const allowedWardIds = getAllowedWardIds(req);
      if (!allowedWardIds || allowedWardIds.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied. No wards assigned to clerk.' });
      }
      // Normalize ward ID comparison
      const requestWardId = request.property ? parseInt(request.property.wardId, 10) : null;
      const normalizedAllowedWardIds = allowedWardIds.map(id => parseInt(id, 10));

      if (!request.property || !requestWardId || !normalizedAllowedWardIds.includes(requestWardId)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Request is in ward ${requestWardId || 'unknown'}, but you only have access to wards [${normalizedAllowedWardIds.join(', ')}]`
        });
      }
    } else if (req.user.role !== 'admin') {
      // Admin with ward filter: check ward access
      const allowedWardIds = getAllowedWardIds(req);
      if (allowedWardIds && allowedWardIds.length > 0 && request.property) {
        const requestWardId = parseInt(request.property.wardId, 10);
        const normalizedAllowedWardIds = allowedWardIds.map(id => parseInt(id, 10));
        if (!normalizedAllowedWardIds.includes(requestWardId)) {
          return res.status(403).json({ success: false, message: 'Access denied to this ward' });
        }
      }
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    // Ward check for clerk
    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && request.property && !allowedWardIds.includes(request.property.wardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    // Check if shop already exists for this property + shopName
    const existingShop = await Shop.findOne({
      where: {
        propertyId: request.propertyId,
        shopName: request.shopName,
        status: 'active'
      }
    });

    if (existingShop) {
      return res.status(409).json({
        success: false,
        message: 'A shop with this name already exists on this property'
      });
    }

    const wardId = request.property.wardId;
    const shopNumber = await generateShopId(wardId);

    // Handle createdBy FK constraint
    // createdBy references 'users' table, but clerk/admin might be from 'admin_management' table
    // If user is staff/clerk from admin_management, their ID doesn't exist in users table
    // Set to null (field is nullable) or use applicantId as fallback
    let createdById = null;
    if (req.userType === 'user' && req.user.id) {
      // User is from users table, safe to use
      createdById = req.user.id;
    } else if (req.userType === 'staff' || req.user.role === 'clerk' || req.user.role === 'admin') {
      // Staff/clerk from admin_management - cannot use their ID for FK
      // Set to null (field allows null) or use applicantId
      createdById = null; // Field is nullable, so null is safe
    }

    // Create Shop record
    const shop = await Shop.create({
      shopNumber,
      propertyId: request.propertyId,
      wardId: request.property.wardId,
      ownerId: request.applicantId,
      shopName: request.shopName,
      shopType: request.shopType,
      category: request.category,
      area: request.area,
      address: request.address || request.property.address,
      tradeLicenseNumber: request.tradeLicenseNumber,
      status: 'active',
      isActive: true,
      remarks: `Created from shop registration request ${request.requestNumber}`,
      createdBy: createdById
    });

    // Update request
    // Handle reviewedBy FK constraint - ShopRegistrationRequest.reviewedBy references users table
    let reviewedById = null;
    if (req.userType === 'user' && req.user.id) {
      reviewedById = req.user.id;
    } else {
      // Staff/clerk from admin_management - set to null (field allows null)
      reviewedById = null;
    }

    await request.update({
      status: 'approved',
      reviewedBy: reviewedById,
      reviewedAt: new Date(),
      adminRemarks: adminRemarks || null,
      shopId: shop.id
    });

    const updated = await ShopRegistrationRequest.findByPk(request.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: Ward, as: 'ward' }]
        },
        { model: User, as: 'applicant' },
        { model: User, as: 'reviewer' },
        { model: Shop, as: 'shop' }
      ]
    });

    // Audit log
    await auditLogger.createAuditLog({
      req,
      user: req.user,
      actionType: 'APPROVE',
      entityType: 'ShopRegistrationRequest',
      entityId: request.id,
      description: `Approved shop registration request: ${request.requestNumber} and created shop: ${shopNumber}`,
      metadata: { requestNumber: request.requestNumber, shopId: shop.id, shopNumber }
    });

    res.json({
      success: true,
      message: 'Shop registration request approved and shop created successfully',
      data: { request: updated, shop }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/shop-registration-requests/:id/reject
 * @desc    Reject shop registration request
 * @access  Private (Admin, Clerk)
 */
export const rejectShopRegistrationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    if (!adminRemarks) {
      return res.status(400).json({
        success: false,
        message: 'adminRemarks is required for rejection'
      });
    }

    const request = await ShopRegistrationRequest.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: Ward, as: 'ward' }]
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Shop registration request not found' });
    }

    // Clerk: ward check - must have access to the property's ward
    if (req.user.role === 'clerk') {
      const allowedWardIds = getAllowedWardIds(req);
      if (!allowedWardIds || allowedWardIds.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied. No wards assigned to clerk.' });
      }
      // Normalize ward ID comparison
      const requestWardId = request.property ? parseInt(request.property.wardId, 10) : null;
      const normalizedAllowedWardIds = allowedWardIds.map(id => parseInt(id, 10));

      if (!request.property || !requestWardId || !normalizedAllowedWardIds.includes(requestWardId)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Request is in ward ${requestWardId || 'unknown'}, but you only have access to wards [${normalizedAllowedWardIds.join(', ')}]`
        });
      }
    } else if (req.user.role !== 'admin') {
      // Admin with ward filter: check ward access
      const allowedWardIds = getAllowedWardIds(req);
      if (allowedWardIds && allowedWardIds.length > 0 && request.property) {
        const requestWardId = parseInt(request.property.wardId, 10);
        const normalizedAllowedWardIds = allowedWardIds.map(id => parseInt(id, 10));
        if (!normalizedAllowedWardIds.includes(requestWardId)) {
          return res.status(403).json({ success: false, message: 'Access denied to this ward' });
        }
      }
    }

    if (!request) {
      return res.status(404).json({ success: false, message: 'Shop registration request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status: ${request.status}`
      });
    }

    // Ward check for clerk
    const allowedWardIds = getAllowedWardIds(req);
    if (allowedWardIds && request.property && !allowedWardIds.includes(request.property.wardId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this ward' });
    }

    // Handle reviewedBy FK constraint - ShopRegistrationRequest.reviewedBy references users table
    let reviewedById = null;
    if (req.userType === 'user' && req.user.id) {
      reviewedById = req.user.id;
    } else {
      // Staff/clerk from admin_management - set to null (field allows null)
      reviewedById = null;
    }

    await request.update({
      status: 'rejected',
      reviewedBy: reviewedById,
      reviewedAt: new Date(),
      adminRemarks
    });

    const updated = await ShopRegistrationRequest.findByPk(request.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: Ward, as: 'ward' }]
        },
        { model: User, as: 'applicant' },
        { model: User, as: 'reviewer' }
      ]
    });

    // Audit log
    await auditLogger.createAuditLog({
      req,
      user: req.user,
      actionType: 'REJECT',
      entityType: 'ShopRegistrationRequest',
      entityId: request.id,
      description: `Rejected shop registration request: ${request.requestNumber}`,
      metadata: { requestNumber: request.requestNumber, adminRemarks }
    });

    res.json({
      success: true,
      message: 'Shop registration request rejected',
      data: { request: updated }
    });
  } catch (error) {
    next(error);
  }
};
