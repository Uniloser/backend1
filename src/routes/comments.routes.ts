const { Router } = require('express') as { Router: () => any };
const rateLimit = require('express-rate-limit');

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as commentsController from '../controllers/comments.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const writes = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: (request: any) => request.user.id,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/chapters/:id/comments', optionalAuth, asyncHandler(commentsController.listComments));
router.post('/chapters/:id/comments', auth, writes, asyncHandler(commentsController.createComment));
router.patch('/comments/:id', auth, writes, asyncHandler(commentsController.updateComment));
router.delete('/comments/:id', auth, writes, asyncHandler(commentsController.deleteComment));

export default router;
