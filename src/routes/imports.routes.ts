// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Routes
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express') as any;
const multer = require('multer') as any;

import { auth } from '../middleware/auth.middleware';
import * as importsController from '../controllers/imports.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

router.post('/imports', auth, upload.single('file'), asyncHandler(importsController.uploadAndProcessImport));
router.get('/imports/:importId/preview', auth, asyncHandler(importsController.getImportPreview));
router.post('/imports/:importId/commit', auth, asyncHandler(importsController.commitImport));
router.delete('/imports/:importId', auth, asyncHandler(importsController.deleteImport));

export default router;

