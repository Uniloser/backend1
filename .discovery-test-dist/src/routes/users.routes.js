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
const usersController = __importStar(require("../controllers/users.controller"));
const followsController = __importStar(require("../controllers/follows.controller"));
const asyncHandler_1 = require("../utils/asyncHandler");
const router = Router();
router.get('/users/me', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(usersController.getCurrentProfile));
router.get('/users/me/stories', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(usersController.getCurrentStories));
router.get('/users/me/follower-count', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(usersController.getCurrentFollowerCount));
router.patch('/users/me', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(usersController.updateCurrentProfile));
router.get('/users/:username', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(usersController.getPublicProfile));
router.get('/users/:username/stories', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(usersController.getPublishedStories));
router.post('/users/:id/follow', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(followsController.follow));
router.delete('/users/:id/follow', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(followsController.unfollow));
router.get('/users/:id/follow', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(followsController.getFollowStatus));
router.get('/users/me/following', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(followsController.listMyFollowing));
router.get('/users/:id/followers', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(followsController.listFollowers));
router.get('/users/:id/following', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(followsController.listFollowing));
exports.default = router;
// User route stub.
// TODO: add public GET /users/:username and GET /users/:username/stories.
// TODO: add protected GET /users/me and PATCH /users/me, plus protected
// POST/DELETE /users/:id/follow and public follower/following reads.
// TODO: use optionalAuth where a public response can include the viewer's
// relationship state; require auth for mutations.
