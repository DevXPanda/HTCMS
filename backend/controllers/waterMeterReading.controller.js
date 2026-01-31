import { WaterMeterReading, WaterConnection, Property, User } from '../models/index.js';
import { Op } from 'sequelize';
import { WATER_METER_READING_TYPE } from '../constants/waterTaxStatuses.js';

/**
 * Generate unique reading number
 */
const generateReadingNumber = async (waterConnectionId) => {
  const year = new Date().getFullYear();
  const count = await WaterMeterReading.count({
    where: {
      readingNumber: {
        [Op.like]: `WR-${year}-%`
      }
    }
  });
  const sequence = String(count + 1).padStart(6, '0');
  return `WR-${year}-${sequence}`;
};

/**
 * @route   POST /api/water-meter-readings
 * @desc    Create new meter reading
 * @access  Private
 */
export const createMeterReading = async (req, res, next) => {
  try {
    // Support both snake_case and camelCase
    const {
      waterConnectionId,
      water_connection_id,
      currentReading,
      current_reading,
      readingDate,
      reading_date,
      readingType,
      reading_type,
      readerName,
      reader_name,
      photoUrl,
      photo_url,
      remarks
    } = req.body;

    // Normalize to camelCase
    const normalizedWaterConnectionId = waterConnectionId || water_connection_id;
    const normalizedCurrentReading = currentReading !== undefined ? currentReading : current_reading;
    const normalizedReadingDate = readingDate || reading_date;
    const normalizedReadingType = readingType || reading_type || WATER_METER_READING_TYPE.ACTUAL;
    const normalizedReaderName = readerName || reader_name;
    const normalizedPhotoUrl = photoUrl || photo_url;

    // Validate mandatory fields
    const missingFields = [];
    if (!normalizedWaterConnectionId || normalizedWaterConnectionId === '' || normalizedWaterConnectionId === null || normalizedWaterConnectionId === undefined) {
      missingFields.push('water_connection_id');
    }
    if (normalizedCurrentReading === null || normalizedCurrentReading === undefined || normalizedCurrentReading === '') {
      missingFields.push('current_reading');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate current reading is a number
    const currentReadingValue = parseFloat(normalizedCurrentReading);
    if (isNaN(currentReadingValue) || currentReadingValue < 0) {
      return res.status(400).json({
        success: false,
        message: 'current_reading must be a valid positive number'
      });
    }

    // Validate reading type enum
    const validReadingTypes = Object.values(WATER_METER_READING_TYPE);
    if (!validReadingTypes.includes(normalizedReadingType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reading_type. Must be one of: ${validReadingTypes.join(', ')}`
      });
    }

    // Fetch water connection and validate it exists and is metered
    const waterConnection = await WaterConnection.findOne({
      where: { id: normalizedWaterConnectionId },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
      ]
    });

    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    // Validate connection is metered
    if (!waterConnection.isMetered) {
      return res.status(400).json({
        success: false,
        message: 'Meter reading can only be added for metered connections'
      });
    }

    // Fetch last reading automatically to get previous reading
    const lastReading = await WaterMeterReading.findOne({
      where: { waterConnectionId: normalizedWaterConnectionId },
      order: [['readingDate', 'DESC'], ['createdAt', 'DESC']]
    });

    const previousReadingValue = lastReading ? parseFloat(lastReading.currentReading) : 0;

    // Validate current reading is not less than previous reading
    if (currentReadingValue < previousReadingValue) {
      return res.status(400).json({
        success: false,
        message: `Current reading (${currentReadingValue}) cannot be less than previous reading (${previousReadingValue})`
      });
    }

    // Auto-calculate consumption
    const consumption = currentReadingValue - previousReadingValue;

    // Generate reading number
    const readingNumber = await generateReadingNumber(normalizedWaterConnectionId);

    // Create meter reading
    const meterReading = await WaterMeterReading.create({
      readingNumber,
      waterConnectionId: parseInt(normalizedWaterConnectionId),
      currentReading: currentReadingValue,
      previousReading: previousReadingValue > 0 ? previousReadingValue : null,
      consumption: consumption,
      readingDate: normalizedReadingDate ? new Date(normalizedReadingDate) : new Date(),
      readingType: normalizedReadingType,
      readerName: normalizedReaderName || null,
      readerId: req.user?.id || null,
      photoUrl: normalizedPhotoUrl || null,
      remarks: remarks || null
    });

    // Fetch created reading with connection details
    const createdReading = await WaterMeterReading.findOne({
      where: { id: meterReading.id },
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status'],
          include: [
            { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
          ]
        },
        {
          model: User,
          as: 'reader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Meter reading created successfully',
      data: { meterReading: createdReading }
    });
  } catch (error) {
    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Reading number already exists'
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/water-meter-readings
 * @desc    Get all meter readings (with filters)
 * @access  Private
 */
export const getAllMeterReadings = async (req, res, next) => {
  try {
    const {
      waterConnectionId,
      readingType,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};

    // Apply filters
    if (waterConnectionId) {
      where.waterConnectionId = parseInt(waterConnectionId);
    }
    if (readingType) {
      where.readingType = readingType;
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { readingNumber: { [Op.iLike]: `%${search}%` } },
        { readerName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await WaterMeterReading.findAndCountAll({
      where,
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status'],
          include: [
            { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'city'] }
          ]
        },
        {
          model: User,
          as: 'reader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['readingDate', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        meterReadings: rows,
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
 * @route   GET /api/water-meter-readings/:id
 * @desc    Get meter reading by ID
 * @access  Private
 */
export const getMeterReadingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const meterReading = await WaterMeterReading.findOne({
      where: { id },
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status', 'connectionType'],
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'propertyNumber', 'address', 'city', 'wardId'],
              include: [
                { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'reader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!meterReading) {
      return res.status(404).json({
        success: false,
        message: 'Meter reading not found'
      });
    }

    res.json({
      success: true,
      data: { meterReading }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-meter-readings/connection/:waterConnectionId
 * @desc    Get all meter readings for a water connection
 * @access  Private
 */
export const getMeterReadingsByConnection = async (req, res, next) => {
  try {
    const { waterConnectionId } = req.params;

    // Validate water connection exists
    const waterConnection = await WaterConnection.findOne({
      where: { id: waterConnectionId },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
      ]
    });

    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    // Get last reading
    const lastReading = await WaterMeterReading.findOne({
      where: { waterConnectionId: parseInt(waterConnectionId) },
      order: [['readingDate', 'DESC'], ['createdAt', 'DESC']]
    });

    // Get all readings
    const meterReadings = await WaterMeterReading.findAll({
      where: { waterConnectionId: parseInt(waterConnectionId) },
      include: [
        {
          model: User,
          as: 'reader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['readingDate', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        waterConnection: {
          id: waterConnection.id,
          connectionNumber: waterConnection.connectionNumber,
          meterNumber: waterConnection.meterNumber,
          isMetered: waterConnection.isMetered,
          property: waterConnection.property
        },
        lastReading: lastReading ? {
          id: lastReading.id,
          readingNumber: lastReading.readingNumber,
          currentReading: lastReading.currentReading,
          readingDate: lastReading.readingDate
        } : null,
        meterReadings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-meter-readings/connection/:waterConnectionId/last
 * @desc    Get last meter reading for a water connection
 * @access  Private
 */
export const getLastMeterReading = async (req, res, next) => {
  try {
    const { waterConnectionId } = req.params;

    // Validate water connection exists
    const waterConnection = await WaterConnection.findOne({
      where: { id: waterConnectionId },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
      ]
    });

    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    // Get last reading
    const lastReading = await WaterMeterReading.findOne({
      where: { waterConnectionId: parseInt(waterConnectionId) },
      include: [
        {
          model: User,
          as: 'reader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['readingDate', 'DESC'], ['createdAt', 'DESC']]
    });

    if (!lastReading) {
      return res.status(404).json({
        success: false,
        message: 'No meter reading found for this connection'
      });
    }

    res.json({
      success: true,
      data: {
        waterConnection: {
          id: waterConnection.id,
          connectionNumber: waterConnection.connectionNumber,
          meterNumber: waterConnection.meterNumber
        },
        lastReading
      }
    });
  } catch (error) {
    next(error);
  }
};
