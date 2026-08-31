const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as bookmarksController from '../controllers/bookmarks.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/bookmarks', auth, asyncHandler(bookmarksController.listBookmarks));
router.post('/bookmarks', auth, asyncHandler(bookmarksController.createBookmark));
router.delete('/bookmarks/story/:storyId', auth, asyncHandler(bookmarksController.deleteBookmarkByStory));
router.delete('/bookmarks/:id', auth, asyncHandler(bookmarksController.deleteBookmark));

export default router;
