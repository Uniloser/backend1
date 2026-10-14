const { Router } = require('express') as { Router: () => any };
import { auth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
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
router.post('/creator/payout-requests', auth, asyncHandler(creatorController.requestPayout));

router.get('/admin/creator-payouts', auth, requireAdmin, asyncHandler(creatorController.listAdminPayouts));
router.get('/admin/creator-payout-reserve', auth, requireAdmin, asyncHandler(creatorController.getAdminPayoutReserve));
router.post('/admin/creator-payout-reserve/fund', auth, requireAdmin, asyncHandler(creatorController.fundPayoutReserve));
router.post('/admin/creator-payouts/:id/review', auth, requireAdmin, asyncHandler(creatorController.reviewPayout));
router.post('/admin/creator-payouts/:id/start-transfer', auth, requireAdmin, asyncHandler(creatorController.startPayoutTransfer));
router.post('/admin/creator-payouts/:id/reconcile', auth, requireAdmin, asyncHandler(creatorController.reconcilePayout));
export default router;
