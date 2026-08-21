const { Router } = require('express') as { Router: () => any };

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as storiesController from '../controllers/stories.controller';
import * as likesController from '../controllers/likes.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/stories', auth, asyncHandler(storiesController.createStory));
router.get('/stories/:id', optionalAuth, asyncHandler(storiesController.getStory));
router.patch('/stories/:id', auth, asyncHandler(storiesController.updateStory));
router.delete('/stories/:id', auth, asyncHandler(storiesController.deleteStory));
router.post('/stories/:id/like', auth, asyncHandler(likesController.likeStory));
router.delete('/stories/:id/like', auth, asyncHandler(likesController.unlikeStory));

export default router;
// Story route stub.
// TODO: add protected POST /stories and PATCH/DELETE /stories/:id.
// TODO: add GET /stories/:id with optionalAuth: published stories are public,
// while drafts are visible only to their author (also checked in the service).
// TODO: add protected POST/DELETE /stories/:id/like and PUT /stories/:id/progress.
