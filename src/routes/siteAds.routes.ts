const { Router } = require('express') as { Router: () => any };

import { optionalAuth } from '../middleware/auth.middleware';
import * as siteAdsController from '../controllers/siteAds.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.get('/ads/site', optionalAuth, asyncHandler(siteAdsController.getActiveAd));

export default router;
