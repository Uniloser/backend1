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
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
const account = __importStar(require("../repositories/account.repository"));
const communityTerms_middleware_1 = require("../middleware/communityTerms.middleware");
const router = require('express').Router();
router.delete('/users/me/account', rateLimit_middleware_1.authRateLimit, auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    if (request.body?.confirmation !== 'DELETE')
        throw new ApiError_1.ApiError(400, 'Type DELETE to confirm permanent account deletion.');
    await account.deleteAccount(request.user.id);
    response.json({ data: { deleted: true } });
}));
router.post('/users/me/community-terms', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    if (request.body?.version !== communityTerms_middleware_1.COMMUNITY_TERMS_VERSION || request.body?.accepted !== true)
        throw new ApiError_1.ApiError(400, 'Please accept the current community terms.');
    await account.acceptCommunityTerms(request.user.id, communityTerms_middleware_1.COMMUNITY_TERMS_VERSION);
    response.json({ data: { accepted: true } });
}));
exports.default = router;
