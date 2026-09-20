const { Router } = require('express') as { Router: () => any };
const { crossOriginResourcePolicy } = require('helmet');

import * as mediaController from '../controllers/media.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// The web reader embeds these redirects from a different origin than the API.
router.get('/media/story-assets/*path', crossOriginResourcePolicy({ policy: 'cross-origin' }), asyncHandler(mediaController.redirectStoryAsset));

export default router;
