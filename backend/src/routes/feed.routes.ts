const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as progressController from '../controllers/progress.controller';
import * as feedController from '../controllers/feed.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.put('/stories/:id/progress', auth, asyncHandler(progressController.updateProgress));
router.get('/library', auth, asyncHandler(progressController.getLibrary));
router.get('/feed', auth, asyncHandler(feedController.getFeed));
router.get('/discover', optionalAuth, asyncHandler(feedController.discover));
router.get('/discover/trending', optionalAuth, asyncHandler(feedController.trending));
router.get('/search', optionalAuth, asyncHandler(feedController.search));

export default router;
// Feed and discovery route stub.
// TODO: add protected GET /feed and GET /library.
// TODO: add public GET /discover, GET /discover/trending, and GET /search;
// optionally accept auth to personalize responses without requiring it.
