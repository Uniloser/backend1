const { Router } = require('express') as { Router: () => any };

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as commentsController from '../controllers/comments.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/chapters/:id/comments', optionalAuth, asyncHandler(commentsController.listComments));
router.post('/chapters/:id/comments', auth, asyncHandler(commentsController.createComment));
router.delete('/comments/:id', auth, asyncHandler(commentsController.deleteComment));

export default router;
// Comment route stub.
// TODO: add public paginated GET /chapters/:id/comments, protected POST
// /chapters/:id/comments, and protected DELETE /comments/:id.
// TODO: controllers must always derive user_id from req.user.id.
