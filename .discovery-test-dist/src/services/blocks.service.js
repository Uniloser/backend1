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
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.listBlocked = listBlocked;
exports.isBlocked = isBlocked;
const blocksRepository = __importStar(require("../repositories/blocks.repository"));
const followsRepository = __importStar(require("../repositories/follows.repository"));
const usersRepository = __importStar(require("../repositories/users.repository"));
const ApiError_1 = require("../utils/ApiError");
async function blockUser(blockerId, blockedId) {
    if (blockerId === blockedId) {
        throw new ApiError_1.ApiError(400, 'You cannot block yourself');
    }
    const user = await usersRepository.findById(blockedId);
    if (!user) {
        throw new ApiError_1.ApiError(404, 'User not found');
    }
    const block = await blocksRepository.blockUser(blockerId, blockedId);
    await Promise.all([
        followsRepository.unfollow(blockerId, blockedId).catch(() => undefined),
        followsRepository.unfollow(blockedId, blockerId).catch(() => undefined),
    ]);
    return block;
}
async function unblockUser(blockerId, blockedId) {
    if (blockerId === blockedId) {
        throw new ApiError_1.ApiError(400, 'You cannot unblock yourself');
    }
    await blocksRepository.unblockUser(blockerId, blockedId);
    return { blocked: false };
}
function listBlocked(blockerId) {
    return blocksRepository.listBlocked(blockerId);
}
function isBlocked(blockerId, blockedId) {
    return blocksRepository.isBlocked(blockerId, blockedId);
}
