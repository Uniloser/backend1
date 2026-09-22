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
exports.uploadImage = uploadImage;
const sharp = require('sharp');
const uploadsRepository = __importStar(require("../repositories/uploads.repository"));
const uploads_validator_1 = require("../validators/uploads.validator");
async function uploadImage(target, userId, file) {
    (0, uploads_validator_1.validateImageFile)(file, target);
    const sharpInstance = sharp(file.buffer);
    const metadata = await sharpInstance.metadata();
    const resizeWidth = target === 'panel' ? 1200 : 800;
    const processed = await sharp(file.buffer)
        .resize({ width: resizeWidth, withoutEnlargement: true })
        .webp({ quality: target === 'panel' ? 85 : 82 })
        .toBuffer();
    const objectPath = `${userId}/${Date.now()}.webp`;
    const url = await uploadsRepository.uploadImage(target, objectPath, processed);
    return {
        url,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
    };
}
// Upload service stub.
// TODO: coordinate multer input, sharp resizing/compression to WebP, Supabase
// Storage bucket selection, public URL creation, and cleanup on failure.
