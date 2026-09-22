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
const { Router } = require('express');
const auth_middleware_1 = require("../middleware/auth.middleware");
const panelsController = __importStar(require("../controllers/panels.controller"));
const asyncHandler_1 = require("../utils/asyncHandler");
const router = Router();
router.get('/chapters/:id/panels', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(panelsController.listPanels));
router.post('/chapters/:id/panels', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(panelsController.createPanel));
router.patch('/chapters/:id/panels/reorder', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(panelsController.reorderPanels));
router.patch('/panels/:id', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(panelsController.updatePanel));
router.delete('/panels/:id', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(panelsController.deletePanel));
exports.default = router;
