const { Router } = require('express') as { Router: () => any };
import { auth } from '../middleware/auth.middleware';
import * as subscriptionsController from '../controllers/subscriptions.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.get('/subscriptions/me', auth, asyncHandler(subscriptionsController.getCurrent));

export default router;
