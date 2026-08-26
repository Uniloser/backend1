const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as walletController from '../controllers/wallet.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/wallet', auth, asyncHandler(walletController.getWallet));
router.get('/wallet/transactions', auth, asyncHandler(walletController.listTransactions));
router.get('/wallet/achievements', auth, asyncHandler(walletController.listAchievements));
router.get('/wallet/challenges', auth, asyncHandler(walletController.listChallenges));

export default router;