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
exports.listComments = listComments;
exports.createComment = createComment;
exports.deleteComment = deleteComment;
const commentsService = __importStar(require("../services/comments.service"));
const comments_validator_1 = require("../validators/comments.validator");
async function listComments(request, response) {
    const { limit, offset } = comments_validator_1.commentsPaginationSchema.parse(request.query);
    const comments = await commentsService.listComments(request.params.id, limit, offset);
    response.json({ data: comments, pagination: { limit, offset } });
}
async function createComment(request, response) {
    const input = comments_validator_1.createCommentSchema.parse(request.body);
    const comment = await commentsService.createComment(request.params.id, request.user.id, input);
    response.status(201).json({ data: comment });
}
async function deleteComment(request, response) {
    await commentsService.deleteComment(request.params.id, request.user.id);
    response.status(204).send();
} // Comment controller stub.
// TODO: create comments with chapter id and req.user.id only; never accept
// user_id from the request body.
// TODO: expose newest-first pagination and owner-scoped deletion.
