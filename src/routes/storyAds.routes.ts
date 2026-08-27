const { Router } = require('express') as { Router: () => any };

import { optionalAuth } from '../middleware/auth.middleware';
import * as storyAdsController from '../controllers/storyAds.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/ads/story', optionalAuth, asyncHandler(storyAdsController.getActiveAd));
router.post('/ads/:id/impression', optionalAuth, asyncHandler(storyAdsController.recordImpression));
router.post('/ads/:id/click', optionalAuth, asyncHandler(storyAdsController.recordClick));

export default router;