const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as pushTokensController from '../controllers/pushTokens.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/push-tokens', auth, asyncHandler(pushTokensController.register));
router.delete('/push-tokens', auth, asyncHandler(pushTokensController.unregister));

export default router;