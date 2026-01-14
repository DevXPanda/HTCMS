import { Property, User, Ward } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @route   GET /api/properties
 * @desc    Get all properties (with filters)
 * @access  Private
 */
export const getAllProperties = async (req, res, next) => {
  try {
    const { 
      ownerId, 
      wardId, 
      propertyType,
      usageType,
      status,
      constructionType,
      search, 
      page = 1, 
      limit = 10 
    } = req.query;

    const where = { isActive: true };
    
    // Filter by owner (for citizens, show only their properties)
    if (req.user.role === 'citizen') {
      where.ownerId = req.user.id;
    } else if (ownerId) {
      where.ownerId = ownerId;
    }

    if (wardId) where.wardId = wardId;
    if (propertyType) where.propertyType = propertyType;
    if (usageType) where.usageType = usageType;
    if (status) where.status = status;
    if (constructionType) where.constructionType = constructionType;
    
    if (search) {
      where[Op.or] = [
        { propertyNumber: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { ownerName: { [Op.iLike]: `%${search}%` } },
        { ownerPhone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Property.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        properties: rows,
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
 * @route   GET /api/properties/:id
 * @desc    Get property by ID
 * @access  Private
 */
export const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await Property.findOne({
      where: { id, isActive: true },
      include: [
        { model: User, as: 'owner', attributes: { exclude: ['password'] } },
        { model: Ward, as: 'ward' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check access based on role
    if (req.user.role === 'citizen') {
      // Citizens can only view their own properties
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'collector' || req.user.role === 'tax_collector') {
      // Collectors can only view properties in their assigned wards
      const assignedWards = await Ward.findAll({
        where: { collectorId: req.user.id, isActive: true },
        attributes: ['id']
      });
      const assignedWardIds = assignedWards.map(w => w.id);
      
      if (!assignedWardIds.includes(property.wardId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view properties in your assigned wards.'
        });
      }
    }
    // Admin, assessor, and cashier can view any property (no additional check needed)

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/properties
 * @desc    Create new property
 * @access  Private (Admin, Assessor, Tax Collector)
 */
export const createProperty = async (req, res, next) => {
  try {
    const {
      propertyNumber,
      ownerId,
      ownerName,
      ownerPhone,
      wardId,
      propertyType,
      usageType,
      address,
      city,
      state,
      pincode,
      area,
      builtUpArea,
      floors,
      constructionType,
      constructionYear,
      geolocation,
      photos,
      occupancyStatus,
      status,
      remarks
    } = req.body;

    // Validation
    if (!propertyNumber || !wardId || !propertyType || !address || !city || !state || !pincode || !area || !ownerName || !ownerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: propertyNumber, wardId, propertyType, address, city, state, pincode, area, ownerName, ownerPhone'
      });
    }

    // Check if property number already exists
    const existingProperty = await Property.findOne({
      where: { propertyNumber }
    });

    if (existingProperty) {
      return res.status(400).json({
        success: false,
        message: 'Property with this number already exists'
      });
    }

    // Validate geolocation format if provided
    if (geolocation && (!geolocation.latitude || !geolocation.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Geolocation must have latitude and longitude'
      });
    }

    const property = await Property.create({
      propertyNumber,
      ownerId: ownerId || req.user.id, // Set to current user if not provided (for database constraint)
      ownerName,
      ownerPhone,
      wardId,
      propertyType,
      usageType: usageType || propertyType,
      address,
      city,
      state,
      pincode,
      area,
      builtUpArea,
      floors: floors || 1,
      constructionType,
      constructionYear,
      geolocation,
      photos: photos || [],
      occupancyStatus: occupancyStatus || 'owner_occupied',
      status: status || 'active',
      remarks,
      createdBy: req.user.id
    });

    const createdProperty = await Property.findByPk(property.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Ward, as: 'ward' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property: createdProperty }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/properties/:id
 * @desc    Update property
 * @access  Private (Admin, Assessor)
 */
export const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Validate ownerName and ownerPhone if they are being updated
    if (updateData.hasOwnProperty('ownerName') && !updateData.ownerName) {
      return res.status(400).json({
        success: false,
        message: 'Owner name is required'
      });
    }
    if (updateData.hasOwnProperty('ownerPhone') && !updateData.ownerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Owner phone is required'
      });
    }

    // Update property
    await property.update(updateData);

    const updatedProperty = await Property.findByPk(id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Ward, as: 'ward' }
      ]
    });

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: { property: updatedProperty }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/properties/search
 * @desc    Advanced search for properties
 * @access  Private
 */
export const searchProperties = async (req, res, next) => {
  try {
    const {
      propertyNumber,
      ownerName,
      ownerPhone,
      wardId,
      propertyType,
      usageType,
      city,
      status,
      minArea,
      maxArea,
      constructionYear,
      page = 1,
      limit = 10
    } = req.query;

    const where = { isActive: true };

    if (propertyNumber) where.propertyNumber = { [Op.iLike]: `%${propertyNumber}%` };
    if (ownerName) where.ownerName = { [Op.iLike]: `%${ownerName}%` };
    if (ownerPhone) where.ownerPhone = { [Op.iLike]: `%${ownerPhone}%` };
    if (wardId) where.wardId = wardId;
    if (propertyType) where.propertyType = propertyType;
    if (usageType) where.usageType = usageType;
    if (city) where.city = { [Op.iLike]: `%${city}%` };
    if (status) where.status = status;
    if (constructionYear) where.constructionYear = constructionYear;

    if (minArea || maxArea) {
      where.area = {};
      if (minArea) where.area[Op.gte] = parseFloat(minArea);
      if (maxArea) where.area[Op.lte] = parseFloat(maxArea);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Property.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        properties: rows,
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
 * @route   GET /api/properties/ward/:wardId
 * @desc    Get properties by ward
 * @access  Private
 */
export const getPropertiesByWard = async (req, res, next) => {
  try {
    const { wardId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Property.findAndCountAll({
      where: { wardId, isActive: true },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['propertyNumber', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        properties: rows,
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
 * @route   DELETE /api/properties/:id
 * @desc    Delete property (soft delete)
 * @access  Private (Admin only)
 */
export const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Soft delete
    property.isActive = false;
    property.status = 'inactive';
    await property.save();

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
