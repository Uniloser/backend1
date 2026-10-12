const { Router } = require('express') as { Router: () => any };
import { auth } from '../middleware/auth.middleware';
import * as creatorController from '../controllers/creator.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.post('/creator/apply-monetization', auth, asyncHandler(creatorController.applyForMonetization));
router.get('/creator/wallet', auth, asyncHandler(creatorController.getWallet));
router.get('/creator/transactions', auth, asyncHandler(creatorController.listTransactions));
router.get('/creator/analytics', auth, asyncHandler(creatorController.getAnalytics));
router.get('/creator/cash-wallet', auth, asyncHandler(creatorController.getCashWallet));
router.get('/creator/cashout/quote', auth, asyncHandler(creatorController.getCashoutQuote));
router.get('/creator/cash-transactions', auth, asyncHandler(creatorController.listCashTransactions));
router.get('/creator/payout-history', auth, asyncHandler(creatorController.listPayoutHistory));
export default router;
