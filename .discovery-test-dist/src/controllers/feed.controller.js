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
exports.getFeed = getFeed;
exports.discover = discover;
exports.discoverFollowing = discoverFollowing;
exports.trending = trending;
exports.search = search;
const feedService = __importStar(require("../services/feed.service"));
const stories_schema_1 = require("../validators/stories.schema");
async function getFeed(request, response) {
    const { limit } = stories_schema_1.discoveryQuerySchema.parse(request.query);
    const feed = await feedService.getFeed(request.user.id, limit);
    response.json({ data: feed });
}
async function discover(request, response) {
    const { genre, limit, offset } = stories_schema_1.discoveryQuerySchema.parse(request.query);
    const stories = await feedService.discover(genre, limit, offset, request.user?.id);
    response.json({ data: stories, pagination: { limit, offset } });
}
async function discoverFollowing(request, response) {
    const { limit } = stories_schema_1.discoveryQuerySchema.parse(request.query);
    const stories = await feedService.discoverFollowing(request.user.id, limit);
    response.json({ data: stories });
}
async function trending(request, response) {
    const { limit } = stories_schema_1.discoveryQuerySchema.parse(request.query);
    const stories = await feedService.trending(limit, request.user?.id);
    response.json({ data: stories });
}
async function search(request, response) {
    const { q, limit, offset } = stories_schema_1.searchQuerySchema.parse(request.query);
    const stories = await feedService.search(q, limit, offset, request.user?.id);
    response.json({ data: stories, pagination: { limit, offset } });
}
// Feed/discovery controller stub.
// TODO: parse pagination, genre, and search query parameters and delegate feed,
// discovery, trending, and search behavior to feed.service.js.
// TODO: return library/progress results scoped to req.user.id.
