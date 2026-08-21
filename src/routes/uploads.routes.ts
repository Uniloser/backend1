const express = require('express') as any;
const multer = require('multer') as any;

import { auth } from '../middleware/auth.middleware';
import * as uploadsController from '../controllers/uploads.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/uploads/cover', auth, upload.single('file'), asyncHandler(uploadsController.uploadCover));
router.post('/uploads/avatar', auth, upload.single('file'), asyncHandler(uploadsController.uploadAvatar));

export default router;
// Upload route stub.
// TODO: protect POST /uploads/cover and POST /uploads/avatar with required auth,
// multer limits, and uploads.controller.js handlers.
