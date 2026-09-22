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
exports.uploadAndProcessImport = uploadAndProcessImport;
exports.getImportPreview = getImportPreview;
exports.commitImport = commitImport;
exports.deleteImport = deleteImport;
// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Controller
// ─────────────────────────────────────────────────────────────────────────────
const importsService = __importStar(require("../services/imports.service"));
const imports_schema_1 = require("../validators/imports.schema");
const ApiError_1 = require("../utils/ApiError");
async function uploadAndProcessImport(request, response) {
    const file = request.file;
    const storyId = request.body.storyId;
    if (!file) {
        throw new ApiError_1.ApiError(400, 'Manuscript file is required');
    }
    if (!storyId) {
        throw new ApiError_1.ApiError(400, 'storyId is required');
    }
    const result = await importsService.processImport(file, storyId, request.user.id);
    response.status(200).json({ data: result });
}
async function getImportPreview(request, response) {
    const preview = await importsService.getImportPreview(request.params.importId, request.user.id);
    response.status(200).json({ data: preview });
}
async function commitImport(request, response) {
    const input = imports_schema_1.commitImportSchema.parse(request.body);
    const result = await importsService.commitImport(request.params.importId, request.user.id, input.chapters);
    response.status(200).json({ data: result });
}
async function deleteImport(request, response) {
    await importsService.deleteImport(request.params.importId, request.user.id);
    response.status(204).send();
}
