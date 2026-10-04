const { Router } = require('express') as { Router: () => any };
import { auth } from '../middleware/auth.middleware';
import * as coinsController from '../controllers/coins.controller';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
router.get('/coins/wallet', auth, asyncHandler(coinsController.getWallet));
router.get('/coins/products', auth, asyncHandler(coinsController.listProducts));
router.get('/coins/history', auth, asyncHandler(coinsController.listHistory));
export default router;
