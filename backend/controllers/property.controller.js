import { Property, User, Ward } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';
import { generatePropertyUniqueId, parsePropertyNumberForId, getNextPropertyNumberInWard } from '../services/uniqueIdService.js';

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
        where: { collectorId: req.user.staff_id || req.user.id, isActive: true },
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
      propertyNumber: bodyPropertyNumber,
      property_number: bodyPropertyNumberSnake,
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

    // Validation - check for missing or empty required fields (propertyNumber is optional; admin can set or leave blank to auto-generate)
    const missingFields = [];
    if (!wardId || wardId === '' || wardId === null || wardId === undefined) {
      missingFields.push('wardId');
    }
    if (!propertyType || (typeof propertyType === 'string' && propertyType.trim() === '')) {
      missingFields.push('propertyType');
    }
    if (!address || (typeof address === 'string' && address.trim() === '')) {
      missingFields.push('address');
    }
    if (!city || (typeof city === 'string' && city.trim() === '')) {
      missingFields.push('city');
    }
    if (!state || (typeof state === 'string' && state.trim() === '')) {
      missingFields.push('state');
    }
    if (!pincode || (typeof pincode === 'string' && pincode.trim() === '')) {
      missingFields.push('pincode');
    }
    // Check area - it can be string or number, but must be valid
    if (area === '' || area === null || area === undefined) {
      missingFields.push('area');
    } else {
      // Try to parse as number to validate
      const testArea = typeof area === 'string' ? parseFloat(area) : area;
      if (isNaN(testArea) || testArea <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid area: must be a positive number'
        });
      }
    }
    if (!ownerName || (typeof ownerName === 'string' && ownerName.trim() === '')) {
      missingFields.push('ownerName');
    }
    if (!ownerPhone || (typeof ownerPhone === 'string' && ownerPhone.trim() === '')) {
      missingFields.push('ownerPhone');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Convert wardId to integer if it's a string
    const parsedWardId = typeof wardId === 'string' ? parseInt(wardId, 10) : wardId;
    if (isNaN(parsedWardId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wardId: must be a valid number'
      });
    }

    // Unique ID = PREFIX + WARD(3) + PROPERTY_NUMBER(4). Use admin property number or next in ward.
    const rawPropertyNumber = bodyPropertyNumber ?? bodyPropertyNumberSnake;
    const adminPropertyNumber =
      rawPropertyNumber != null && String(rawPropertyNumber).trim() !== ''
        ? String(rawPropertyNumber).trim()
        : null;

    const propertyNumberForId = adminPropertyNumber != null
      ? parsePropertyNumberForId(adminPropertyNumber)
      : await getNextPropertyNumberInWard(parsedWardId);
    const uniqueCode = generatePropertyUniqueId(parsedWardId, propertyType, propertyNumberForId);

    const existingByUniqueCode = await Property.findOne({
      where: { uniqueCode }
    });
    if (existingByUniqueCode) {
      return res.status(400).json({
        success: false,
        message: `Unique code ${uniqueCode} already exists. Change property number or ward.`
      });
    }
    if (adminPropertyNumber) {
      const existingByPropertyNumber = await Property.findOne({
        where: { propertyNumber: adminPropertyNumber }
      });
      if (existingByPropertyNumber) {
        return res.status(400).json({
          success: false,
          message: 'Property with this number already exists'
        });
      }
    }

    // Validate geolocation format if provided
    if (geolocation && (!geolocation.latitude || !geolocation.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Geolocation must have latitude and longitude'
      });
    }

    // Convert area to number
    const parsedArea = typeof area === 'string' ? parseFloat(area) : area;
    if (isNaN(parsedArea) || parsedArea <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid area: must be a positive number'
      });
    }

    // Convert builtUpArea to number if provided
    let parsedBuiltUpArea = null;
    if (builtUpArea !== undefined && builtUpArea !== null && builtUpArea !== '') {
      parsedBuiltUpArea = typeof builtUpArea === 'string' ? parseFloat(builtUpArea) : builtUpArea;
      if (isNaN(parsedBuiltUpArea) || parsedBuiltUpArea < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid builtUpArea: must be a non-negative number'
        });
      }
    }

    // Convert floors to integer if provided
    let parsedFloors = 1;
    if (floors !== undefined && floors !== null && floors !== '') {
      parsedFloors = typeof floors === 'string' ? parseInt(floors, 10) : floors;
      if (isNaN(parsedFloors) || parsedFloors < 1) {
        parsedFloors = 1;
      }
    }

    // Convert constructionYear to integer if provided
    let parsedConstructionYear = null;
    if (constructionYear !== undefined && constructionYear !== null && constructionYear !== '') {
      parsedConstructionYear = typeof constructionYear === 'string' ? parseInt(constructionYear, 10) : constructionYear;
      if (isNaN(parsedConstructionYear)) {
        parsedConstructionYear = null;
      }
    }

    // Handle ownerId: search for matching citizen user
    let finalOwnerId = ownerId;
    let matchedCitizen = null;

    if (!finalOwnerId && ownerPhone) {
      // Priority 1: Search for citizen user by exact phone match
      matchedCitizen = await User.findOne({
        where: {
          phone: ownerPhone.trim(),
          role: 'citizen',
          isActive: true
        }
      });

      if (matchedCitizen) {
        finalOwnerId = matchedCitizen.id;
        console.log('Found citizen user by phone:', finalOwnerId, matchedCitizen.email);
      }
    }

    // Priority 2: If phone match not found and email is provided, search by email
    // Note: Email is not in the form, but keeping this for future extensibility
    if (!matchedCitizen && !finalOwnerId) {
      // Email search would go here if email field is added to the form
      // For now, this is a placeholder
    }

    // If no matching citizen found, use admin's ID as fallback
    // Properties without a linked citizen won't appear in citizen panels
    // (citizen panel queries by ownerId === loggedInUser.id)
    if (!finalOwnerId) {
      finalOwnerId = req.user.id;
      console.log('No matching citizen found. Using admin ID as fallback:', finalOwnerId);
      console.log('   Property will not appear in any citizen panel.');
    } else {
      console.log('Property will be linked to citizen ID:', finalOwnerId);
    }

    // Validate that ownerId exists in database
    const ownerUser = await User.findByPk(finalOwnerId);
    if (!ownerUser) {
      return res.status(400).json({
        success: false,
        message: `Invalid ownerId: User with ID ${finalOwnerId} does not exist`
      });
    }

    // Validate wardId exists
    const ward = await Ward.findByPk(parsedWardId);
    if (!ward) {
      return res.status(400).json({
        success: false,
        message: `Invalid wardId: Ward with ID ${parsedWardId} does not exist`
      });
    }

    // Validate enum values
    const validPropertyTypes = ['residential', 'commercial', 'industrial', 'agricultural', 'mixed'];
    if (!validPropertyTypes.includes(propertyType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid propertyType: must be one of ${validPropertyTypes.join(', ')}`
      });
    }

    const validUsageTypes = ['residential', 'commercial', 'industrial', 'agricultural', 'mixed', 'institutional'];
    if (usageType && !validUsageTypes.includes(usageType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid usageType: must be one of ${validUsageTypes.join(', ')}`
      });
    }

    const validConstructionTypes = ['RCC', 'Pucca', 'Kutcha', 'Semi-Pucca'];
    if (constructionType && !validConstructionTypes.includes(constructionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid constructionType: must be one of ${validConstructionTypes.join(', ')}`
      });
    }

    const validOccupancyStatuses = ['owner_occupied', 'tenant_occupied', 'vacant'];
    if (occupancyStatus && !validOccupancyStatuses.includes(occupancyStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid occupancyStatus: must be one of ${validOccupancyStatuses.join(', ')}`
      });
    }

    const validStatuses = ['active', 'inactive', 'pending', 'disputed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: must be one of ${validStatuses.join(', ')}`
      });
    }

    const propertyNumber = adminPropertyNumber || uniqueCode;

    const property = await Property.create({
      propertyNumber,
      uniqueCode,
      ownerId: finalOwnerId,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      wardId: parsedWardId,
      propertyType,
      usageType: usageType || propertyType,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      area: parsedArea,
      builtUpArea: parsedBuiltUpArea,
      floors: parsedFloors,
      constructionType,
      constructionYear: parsedConstructionYear,
      geolocation: geolocation || null,
      photos: Array.isArray(photos) ? photos : (photos ? [photos] : []),
      occupancyStatus: occupancyStatus || 'owner_occupied',
      status: status || 'active',
      remarks: remarks ? remarks.trim() : null,
      createdBy: req.user.id
    });

    const createdProperty = await Property.findByPk(property.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Ward, as: 'ward' }
      ]
    });

    // Log property creation
    await auditLogger.logCreate(
      req,
      req.user,
      'Property',
      property.id,
      { propertyNumber: property.propertyNumber, address: property.address, wardId: property.wardId },
      `Created property: ${property.propertyNumber}`
    );

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property: createdProperty }
    });
  } catch (error) {
    // Log error details for debugging
    console.error('Property creation error:', {
      name: error.name,
      message: error.message,
      errors: error.errors ? error.errors.map(e => ({ field: e.path, message: e.message })) : null
    });
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
    const updateData = { ...req.body };

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const wardChanged = updateData.hasOwnProperty('wardId') && updateData.wardId !== property.wardId;
    const propertyNumberChanged = updateData.hasOwnProperty('propertyNumber') && String(updateData.propertyNumber).trim() !== String(property.propertyNumber || '').trim();
    if (wardChanged || propertyNumberChanged) {
      const wardId = updateData.wardId != null ? updateData.wardId : property.wardId;
      const propertyType = updateData.propertyType != null ? updateData.propertyType : property.propertyType;
      const propNum = parsePropertyNumberForId(updateData.propertyNumber != null ? updateData.propertyNumber : property.propertyNumber);
      const newUniqueCode = generatePropertyUniqueId(wardId, propertyType, propNum);
      const existing = await Property.findOne({
        where: { uniqueCode: newUniqueCode, id: { [Op.ne]: id } }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Unique code ${newUniqueCode} already exists. Use a different property number or ward.`
        });
      }
      updateData.uniqueCode = newUniqueCode;
    }

    // Capture previous data for audit log
    const previousData = {
      propertyNumber: property.propertyNumber,
      address: property.address,
      wardId: property.wardId,
      status: property.status,
      isActive: property.isActive
    };

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

    // Log property update
    const newData = {
      propertyNumber: property.propertyNumber,
      address: property.address,
      wardId: property.wardId,
      status: property.status,
      isActive: property.isActive
    };
    await auditLogger.logUpdate(
      req,
      req.user,
      'Property',
      property.id,
      previousData,
      newData,
      `Updated property: ${property.propertyNumber}`
    );

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

    // Capture previous data for audit log
    const previousData = {
      propertyNumber: property.propertyNumber,
      address: property.address,
      wardId: property.wardId,
      status: property.status,
      isActive: property.isActive
    };

    // Soft delete
    property.isActive = false;
    property.status = 'inactive';
    await property.save();

    // Log property deletion
    await auditLogger.logDelete(
      req,
      req.user,
      'Property',
      property.id,
      previousData,
      `Deleted property: ${property.propertyNumber}`
    );

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
