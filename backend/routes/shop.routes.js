import express from 'express';
import { authenticate, authorize, requireWardAccess } from '../middleware/enhancedAuth.js';
import {
  getAllShops,
  getShopById,
  createShop,
  updateShop,
  getShopsByProperty
} from '../controllers/shop.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(requireWardAccess);

router.get('/', getAllShops);
router.get('/property/:propertyId', getShopsByProperty);
router.get('/:id', getShopById);

router.post('/', authorize('admin', 'clerk'), createShop);
router.put('/:id', authorize('admin', 'clerk'), updateShop);

export default router;
