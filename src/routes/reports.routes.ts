const { Router } = require('express') as { Router: () => any };

import { auth } from '../middleware/auth.middleware';
import * as reportsController from '../controllers/reports.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/reports', auth, asyncHandler(reportsController.createReport));

export default router;