const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/auth/signup', authRateLimit, asyncHandler(authController.signUp));
router.post('/auth/signin', authRateLimit, asyncHandler(authController.signIn));
router.post('/auth/signout', auth, asyncHandler(authController.signOut));

export default router;
// Public auth route stub.
// TODO: define signup/signin/session endpoints as public routes; auth.routes.js
// must not require auth.middleware.js itself.
