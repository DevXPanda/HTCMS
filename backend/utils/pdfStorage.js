import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PDF Storage Utility
 * Handles PDF file storage and retrieval
 */

// Base uploads directory
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PDFS_DIR = path.join(UPLOADS_DIR, 'pdfs');
const RECEIPTS_DIR = path.join(PDFS_DIR, 'receipts');
const NOTICES_DIR = path.join(PDFS_DIR, 'notices');

// Ensure directories exist
const ensureDirectories = () => {
  [UPLOADS_DIR, PDFS_DIR, RECEIPTS_DIR, NOTICES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize directories on module load
ensureDirectories();

/**
 * Generate unique filename for PDF
 */
export const generatePdfFilename = (prefix, id, type = 'pdf') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${id}_${timestamp}_${random}.${type}`;
};

/**
 * Get full path for receipt PDF
 */
export const getReceiptPdfPath = (filename) => {
  return path.join(RECEIPTS_DIR, filename);
};

/**
 * Get full path for notice PDF
 */
export const getNoticePdfPath = (filename) => {
  return path.join(NOTICES_DIR, filename);
};

/**
 * Get relative URL path for PDF (for API access)
 */
export const getReceiptPdfUrl = (filename) => {
  return `/api/payments/receipts/${filename}`;
};

/**
 * Get relative URL path for notice PDF (for API access)
 */
export const getNoticePdfUrl = (filename) => {
  return `/api/notices/pdfs/${filename}`;
};

/**
 * Save PDF file to disk
 */
export const savePdfFile = async (pdfBuffer, filePath) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, pdfBuffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(filePath);
      }
    });
  });
};

/**
 * Read PDF file from disk
 */
export const readPdfFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

/**
 * Check if PDF file exists
 */
export const pdfFileExists = (filePath) => {
  return fs.existsSync(filePath);
};

/**
 * Delete PDF file (for cleanup if needed)
 */
export const deletePdfFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    } else {
      resolve(false);
    }
  });
};

/**
 * Get PDF file stats
 */
export const getPdfFileStats = (filePath) => {
  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath);
  }
  return null;
};
