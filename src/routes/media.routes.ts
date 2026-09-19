const { Router } = require('express') as { Router: () => any };

import * as mediaController from '../controllers/media.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/media/story-assets/*path', asyncHandler(mediaController.redirectStoryAsset));

export default router;
