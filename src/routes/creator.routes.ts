const { Router } = require('express') as { Router: () => any };
import { auth } from '../middleware/auth.middleware';
import * as creatorController from '../controllers/creator.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.post('/creator/apply-monetization', auth, asyncHandler(creatorController.applyForMonetization));
router.get('/creator/wallet', auth, asyncHandler(creatorController.getWallet));
router.get('/creator/transactions', auth, asyncHandler(creatorController.listTransactions));
router.get('/creator/analytics', auth, asyncHandler(creatorController.getAnalytics));
export default router;
