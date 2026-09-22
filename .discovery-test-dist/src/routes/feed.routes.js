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
const progressController = __importStar(require("../controllers/progress.controller"));
const feedController = __importStar(require("../controllers/feed.controller"));
const auth_middleware_2 = require("../middleware/auth.middleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const discoveryController = __importStar(require("../controllers/discovery.controller"));
const rateLimit = require('express-rate-limit');
const router = Router();
const discoveryLimit = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: true, legacyHeaders: false });
const discoveryEventsLimit = rateLimit({ windowMs: 60000, limit: 30, standardHeaders: true, legacyHeaders: false });
router.get('/discovery', auth_middleware_2.optionalAuth, discoveryLimit, (0, asyncHandler_1.asyncHandler)(discoveryController.discover));
router.put('/discovery/preferences', auth_middleware_1.auth, discoveryLimit, (0, asyncHandler_1.asyncHandler)(discoveryController.preferences));
router.post('/discovery/events', auth_middleware_2.optionalAuth, discoveryEventsLimit, (0, asyncHandler_1.asyncHandler)(discoveryController.events));
router.put('/stories/:id/progress', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(progressController.updateProgress));
router.get('/library', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(progressController.getLibrary));
router.get('/feed', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(feedController.getFeed));
router.get('/discover/following', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(feedController.discoverFollowing));
router.get('/discover', auth_middleware_2.optionalAuth, (0, asyncHandler_1.asyncHandler)(feedController.discover));
router.get('/discover/trending', auth_middleware_2.optionalAuth, (0, asyncHandler_1.asyncHandler)(feedController.trending));
router.get('/search', auth_middleware_2.optionalAuth, (0, asyncHandler_1.asyncHandler)(feedController.search));
exports.default = router;
// Feed and discovery route stub.
// TODO: add protected GET /feed and GET /library.
// TODO: add public GET /discover, GET /discover/trending, and GET /search;
// optionally accept auth to personalize responses without requiring it.
