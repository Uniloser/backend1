"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const multer = require('multer');
const auth_middleware_1 = require("../middleware/auth.middleware");
const uploadsController = __importStar(require("../controllers/uploads.controller"));
const asyncHandler_1 = require("../utils/asyncHandler");
const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});
router.post('/uploads/cover', auth_middleware_1.auth, upload.single('file'), (0, asyncHandler_1.asyncHandler)(uploadsController.uploadCover));
router.post('/uploads/avatar', auth_middleware_1.auth, upload.single('file'), (0, asyncHandler_1.asyncHandler)(uploadsController.uploadAvatar));
router.post('/uploads/panel', auth_middleware_1.auth, upload.single('file'), (0, asyncHandler_1.asyncHandler)(uploadsController.uploadPanel));
exports.default = router;
// Upload route stub.
// TODO: protect POST /uploads/cover and POST /uploads/avatar with required auth,
// multer limits, and uploads.controller.js handlers.
