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
exports.getPublicProfile = getPublicProfile;
exports.getCurrentProfile = getCurrentProfile;
exports.getCurrentStories = getCurrentStories;
exports.getCurrentFollowerCount = getCurrentFollowerCount;
exports.updateCurrentProfile = updateCurrentProfile;
exports.getPublishedStories = getPublishedStories;
const usersService = __importStar(require("../services/users.service"));
const users_validator_1 = require("../validators/users.validator");
async function getPublicProfile(request, response) {
    const username = users_validator_1.usernameSchema.parse(request.params.username);
    const profile = await usersService.getPublicProfile(username);
    response.json({ data: profile });
}
async function getCurrentProfile(request, response) {
    const profile = await usersService.getCurrentProfile(request.user.id);
    response.json({ data: profile });
}
async function getCurrentStories(request, response) {
    const stories = await usersService.getCurrentStories(request.user.id);
    response.json({ data: stories });
}
async function getCurrentFollowerCount(request, response) {
    const count = await usersService.getCurrentFollowerCount(request.user.id);
    response.json({ data: { count } });
}
async function updateCurrentProfile(request, response) {
    const input = users_validator_1.updateProfileSchema.parse(request.body);
    const profile = await usersService.updateCurrentProfile(request.user.id, input);
    response.json({ data: profile });
}
async function getPublishedStories(request, response) {
    const username = users_validator_1.usernameSchema.parse(request.params.username);
    const stories = await usersService.getPublishedStories(username);
    response.json({ data: stories });
}
// User controller stub.
// TODO: expose public profile data (bio, avatar, published stories, follower
// count), and protected GET/PATCH /users/me operations.
// TODO: validate input before calling users.service.js and never query the
// users table directly from this layer.
// TODO: derive follow mutations from req.user.id and route params.
