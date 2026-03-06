import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { authenticate, authorize, requireWardAccess } from '../middleware/enhancedAuth.js';
import {
  getAllShops,
  getShopById,
  createShop,
  updateShop,
  getShopsByProperty
} from '../controllers/shop.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shopLicensesDir = path.join(__dirname, '../uploads/shop-licenses');
if (!fs.existsSync(shopLicensesDir)) {
  fs.mkdirSync(shopLicensesDir, { recursive: true });
}

const shopLicenseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, shopLicensesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const name = `license-${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const shopLicenseFileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and images (JPEG, PNG, GIF, WebP) are allowed for the license document.'), false);
  }
};

const uploadLicenseDocument = multer({
  storage: shopLicenseStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: shopLicenseFileFilter
});

const router = express.Router();

router.use(authenticate);
router.use(requireWardAccess);

router.get('/', getAllShops);
router.get('/property/:propertyId', getShopsByProperty);
router.get('/:id', getShopById);

router.post('/', authorize('admin', 'clerk'), uploadLicenseDocument.single('licenseDocument'), createShop);
router.put('/:id', authorize('admin', 'clerk'), updateShop);

export default router;
