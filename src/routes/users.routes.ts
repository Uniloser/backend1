const { Router } = require('express') as { Router: () => any };

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as usersController from '../controllers/users.controller';
import * as followsController from '../controllers/follows.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/users/me', auth, asyncHandler(usersController.getCurrentProfile));
router.get('/users/me/stories', auth, asyncHandler(usersController.getCurrentStories));
router.patch('/users/me', auth, asyncHandler(usersController.updateCurrentProfile));
router.get('/users/:username', optionalAuth, asyncHandler(usersController.getPublicProfile));
router.get('/users/:username/stories', optionalAuth, asyncHandler(usersController.getPublishedStories));
router.post('/users/:id/follow', auth, asyncHandler(followsController.follow));
router.delete('/users/:id/follow', auth, asyncHandler(followsController.unfollow));
router.get('/users/:id/follow', auth, asyncHandler(followsController.getFollowStatus));
router.get('/users/me/following', auth, asyncHandler(followsController.listMyFollowing));
router.get('/users/:id/followers', optionalAuth, asyncHandler(followsController.listFollowers));
router.get('/users/:id/following', optionalAuth, asyncHandler(followsController.listFollowing));

export default router;
// User route stub.
// TODO: add public GET /users/:username and GET /users/:username/stories.
// TODO: add protected GET /users/me and PATCH /users/me, plus protected
// POST/DELETE /users/:id/follow and public follower/following reads.
// TODO: use optionalAuth where a public response can include the viewer's
// relationship state; require auth for mutations.
