const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as blocksController from '../controllers/blocks.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/users/me/blocks', auth, asyncHandler(blocksController.listBlocked));
router.post('/users/:id/block', auth, asyncHandler(blocksController.blockUser));
router.delete('/users/:id/block', auth, asyncHandler(blocksController.unblockUser));

export default router;
