const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as promotionsController from '../controllers/promotions.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.get('/promotions', auth, asyncHandler(promotionsController.listMine));
router.post('/promotions', auth, asyncHandler(promotionsController.create));

export default router;