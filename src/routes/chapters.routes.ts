const { Router } = require('express') as { Router: () => any };

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as chaptersController from '../controllers/chapters.controller';
import * as likesController from '../controllers/likes.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/chapters/:id/like', optionalAuth, asyncHandler(likesController.chapterLikeStatus));
router.post('/chapters/:id/like', auth, asyncHandler(likesController.likeChapter));
router.delete('/chapters/:id/like', auth, asyncHandler(likesController.unlikeChapter));

router.post('/stories/:storyId/chapters', auth, asyncHandler(chaptersController.createChapter));
router.get('/stories/:storyId/chapters', optionalAuth, asyncHandler(chaptersController.listChapters));
router.patch('/stories/:storyId/chapters/reorder', auth, asyncHandler(chaptersController.reorderChapters));
router.get('/chapters/:id', optionalAuth, asyncHandler(chaptersController.getChapter));
router.patch('/chapters/:id', auth, asyncHandler(chaptersController.updateChapter));
// Dedicated status endpoint – only way to change publication state.
router.patch('/chapters/:id/status', auth, asyncHandler(chaptersController.updateChapterStatus));
router.delete('/chapters/:id', auth, asyncHandler(chaptersController.deleteChapter));
router.get('/chapters/:id/autosave', auth, asyncHandler(chaptersController.getAutosave));
router.patch('/chapters/:id/autosave', auth, asyncHandler(chaptersController.saveAutosave));

export default router;
