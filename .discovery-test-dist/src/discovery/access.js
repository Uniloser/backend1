"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireReadableStory = requireReadableStory;
const discovery_repository_1 = require("../repositories/discovery.repository");
const ApiError_1 = require("../utils/ApiError");
async function requireReadableStory(storyId, userId) {
    if (!await (0, discovery_repository_1.canReadStory)(storyId, userId))
        throw new ApiError_1.ApiError(404, 'Story not found');
}
