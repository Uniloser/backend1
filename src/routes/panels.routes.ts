const { Router } = require('express') as { Router: () => any };

import { auth, optionalAuth } from '../middleware/auth.middleware';
import * as panelsController from '../controllers/panels.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/chapters/:id/panels', optionalAuth, asyncHandler(panelsController.listPanels));
router.post('/chapters/:id/panels', auth, asyncHandler(panelsController.createPanel));
router.patch('/chapters/:id/panels/reorder', auth, asyncHandler(panelsController.reorderPanels));
router.patch('/panels/:id', auth, asyncHandler(panelsController.updatePanel));
router.delete('/panels/:id', auth, asyncHandler(panelsController.deletePanel));

export default router;
