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
exports.createStory = createStory;
exports.getStory = getStory;
exports.getRecommendations = getRecommendations;
exports.updateStory = updateStory;
exports.deleteStory = deleteStory;
const storiesService = __importStar(require("../services/stories.service"));
const stories_schema_1 = require("../validators/stories.schema");
async function createStory(request, response) {
    const input = stories_schema_1.createStorySchema.parse(request.body);
    const story = await storiesService.createStory(request.user.id, input);
    response.status(201).json({ data: story });
}
async function getStory(request, response) {
    const story = await storiesService.getStory(request.params.id, request.user?.id);
    response.json({ data: story });
}
async function getRecommendations(request, response) {
    const stories = await storiesService.getRecommendations(request.params.id, 8, request.user?.id);
    response.json({ data: stories });
}
async function updateStory(request, response) {
    const input = stories_schema_1.updateStorySchema.parse(request.body);
    const story = await storiesService.updateStory(request.params.id, request.user.id, input);
    response.json({ data: story });
}
async function deleteStory(request, response) {
    await storiesService.deleteStory(request.params.id, request.user.id);
    response.status(204).send();
}
// Story controller stub.
// TODO: validate request input, pass req.user.id and route/body data to the
// stories service, and translate service results into HTTP responses.
// TODO: keep publish eligibility, author checks, draft visibility, soft/hard
// deletion, and like-count behavior in services/repositories.
