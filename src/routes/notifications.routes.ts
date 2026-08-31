const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as notificationsController from '../controllers/notifications.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/notifications', auth, asyncHandler(notificationsController.listNotifications));
router.get('/notifications/unread-count', auth, asyncHandler(notificationsController.unreadCount));
router.post('/notifications/read-all', auth, asyncHandler(notificationsController.markAllRead));
router.post('/notifications/:id/read', auth, asyncHandler(notificationsController.markRead));

export default router;
