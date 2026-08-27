const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as analyticsController from '../controllers/analytics.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.get('/analytics/author', auth, asyncHandler(analyticsController.getAuthorAnalytics));

export default router;