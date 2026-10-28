const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authIpRateLimit, authRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/auth/signup', authIpRateLimit, authRateLimit, asyncHandler(authController.signUp));
router.post('/auth/signin', authIpRateLimit, authRateLimit, asyncHandler(authController.signIn));
router.post('/auth/signout', auth, asyncHandler(authController.signOut));

export default router;
