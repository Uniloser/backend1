const { Router } = require('express') as { Router: () => any };

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as chaptersController from '../controllers/chapters.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/stories/:storyId/chapters', auth, asyncHandler(chaptersController.createChapter));
router.get('/stories/:storyId/chapters', optionalAuth, asyncHandler(chaptersController.listChapters));
router.patch('/stories/:storyId/chapters/reorder', auth, asyncHandler(chaptersController.reorderChapters));
router.get('/chapters/:id', optionalAuth, asyncHandler(chaptersController.getChapter));
router.patch('/chapters/:id', auth, asyncHandler(chaptersController.updateChapter));
router.delete('/chapters/:id', auth, asyncHandler(chaptersController.deleteChapter));
router.get('/chapters/:id/autosave', auth, asyncHandler(chaptersController.getAutosave));
router.patch('/chapters/:id/autosave', auth, asyncHandler(chaptersController.saveAutosave));

export default router;
// Chapter route stub.
// TODO: add protected chapter create/edit/delete/reorder routes and public
// reads for published chapters, using optionalAuth for author draft access.
// TODO: support POST /stories/:storyId/chapters, GET/PATCH/DELETE /chapters/:id,
// GET /stories/:storyId/chapters, and PATCH /stories/:storyId/chapters/reorder.
