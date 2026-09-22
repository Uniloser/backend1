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
const authController = __importStar(require("../controllers/auth.controller"));
const asyncHandler_1 = require("../utils/asyncHandler");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = Router();
router.post('/auth/signup', rateLimit_middleware_1.authRateLimit, (0, asyncHandler_1.asyncHandler)(authController.signUp));
router.post('/auth/signin', rateLimit_middleware_1.authRateLimit, (0, asyncHandler_1.asyncHandler)(authController.signIn));
router.post('/auth/signout', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(authController.signOut));
exports.default = router;
// Public auth route stub.
// TODO: define signup/signin/session endpoints as public routes; auth.routes.js
// must not require auth.middleware.js itself.
