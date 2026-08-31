const { Router } = require('express') as { Router: () => any };

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as storiesController from '../controllers/stories.controller';
import * as likesController from '../controllers/likes.controller';
import * as storyViewsController from '../controllers/storyViews.controller';
import { asyncHandler } from '../utils/asyncHandler';
import * as genresController from '../controllers/genres.controller';

const router = Router();

router.get('/genres', asyncHandler(genresController.listGenres));
router.post('/stories', auth, asyncHandler(storiesController.createStory));
router.get('/stories/:id/recommendations', optionalAuth, asyncHandler(storiesController.getRecommendations));
router.get('/stories/:id', optionalAuth, asyncHandler(storiesController.getStory));
router.patch('/stories/:id', auth, asyncHandler(storiesController.updateStory));
router.delete('/stories/:id', auth, asyncHandler(storiesController.deleteStory));
router.post('/stories/:id/like', auth, asyncHandler(likesController.likeStory));
router.delete('/stories/:id/like', auth, asyncHandler(likesController.unlikeStory));
router.post('/stories/:id/views', optionalAuth, asyncHandler(storyViewsController.recordView));

export default router;
