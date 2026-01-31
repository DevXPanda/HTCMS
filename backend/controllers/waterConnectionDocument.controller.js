import { WaterConnectionDocument, WaterConnection, User } from '../models/index.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MANDATORY_DOCUMENT_TYPES, validateMandatoryDocuments, WATER_CONNECTION_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../constants/waterConnectionDocumentTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * @route   POST /api/water-connection-documents
 * @desc    Upload document for water connection
 * @access  Private
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const { waterConnectionId, documentType, documentName } = req.body;
    const file = req.file;

    // Validate required fields
    if (!waterConnectionId) {
      return res.status(400).json({
        success: false,
        message: 'waterConnectionId is required'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'documentType is required'
      });
    }

    if (!Object.values(WATER_CONNECTION_DOCUMENT_TYPES).includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid documentType. Must be one of: ${Object.values(WATER_CONNECTION_DOCUMENT_TYPES).join(', ')}`
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify water connection exists
    const waterConnection = await WaterConnection.findByPk(waterConnectionId);
    if (!waterConnection) {
      // Delete uploaded file if connection doesn't exist
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    // Create document record
    // Store relative path for filePath (for serving via static route)
    const relativeFilePath = `/uploads/${file.filename}`;
    const document = await WaterConnectionDocument.create({
      waterConnectionId: parseInt(waterConnectionId),
      documentType,
      documentName: documentName || file.originalname,
      fileName: file.filename,
      filePath: relativeFilePath, // Store relative path for serving
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user.id
    });

    const createdDocument = await WaterConnectionDocument.findByPk(document.id, {
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document: createdDocument }
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    next(error);
  }
};

/**
 * @route   GET /api/water-connection-documents
 * @desc    Get all documents for a water connection
 * @access  Private
 */
export const getDocuments = async (req, res, next) => {
  try {
    const { waterConnectionId } = req.query;

    if (!waterConnectionId) {
      return res.status(400).json({
        success: false,
        message: 'waterConnectionId is required'
      });
    }

    const documents = await WaterConnectionDocument.findAll({
      where: {
        waterConnectionId: parseInt(waterConnectionId)
      },
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['uploadedAt', 'DESC']]
    });

    // Check mandatory documents
    const validation = validateMandatoryDocuments(documents);

    res.json({
      success: true,
      data: {
        documents,
        mandatoryValidation: validation
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-connection-documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
export const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await WaterConnectionDocument.findByPk(id, {
      include: [
        { model: WaterConnection, as: 'waterConnection' },
        { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/water-connection-documents/:id
 * @desc    Delete document
 * @access  Private
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await WaterConnectionDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from filesystem
    // Handle both absolute and relative paths
    let filePath = document.filePath;
    if (filePath.startsWith('/uploads/')) {
      // If relative path (starts with /uploads/), construct absolute path
      filePath = path.join(uploadsDir, path.basename(filePath));
    } else if (!path.isAbsolute(filePath)) {
      // If relative path without /uploads/, construct absolute path
      filePath = path.join(uploadsDir, path.basename(filePath));
    }
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete database record
    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-connection-documents/mandatory/check
 * @desc    Check if all mandatory documents are uploaded for a connection
 * @access  Private
 */
export const checkMandatoryDocuments = async (req, res, next) => {
  try {
    const { waterConnectionId } = req.query;

    if (!waterConnectionId) {
      return res.status(400).json({
        success: false,
        message: 'waterConnectionId is required'
      });
    }

    const documents = await WaterConnectionDocument.findAll({
      where: {
        waterConnectionId: parseInt(waterConnectionId)
      },
      attributes: ['documentType']
    });

    const validation = validateMandatoryDocuments(documents);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    next(error);
  }
};
