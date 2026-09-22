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
const rateLimit = require('express-rate-limit');
const auth_middleware_1 = require("../middleware/auth.middleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const repo = __importStar(require("../repositories/community.repository"));
const v = __importStar(require("../validators/community.validator"));
const router = Router();
const writes = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false });
const handle = (fn) => (0, asyncHandler_1.asyncHandler)(async (req, res) => { res.json({ data: await fn(req) }); });
const id = (req) => v.communityId.parse(req.params.id);
router.get('/community', auth_middleware_1.optionalAuth, handle(req => { const q = v.communityQuery.parse(req.query); return repo.feed(req.user?.id, q.tab, q.limit, q.offset); }));
router.get('/community/sidebar', auth_middleware_1.optionalAuth, handle(req => repo.sidebar(req.user?.id)));
router.get('/community/posts/:id', auth_middleware_1.optionalAuth, handle(async (req) => repo.hydrate(await repo.getPost(id(req), req.user?.id), req.user?.id)));
router.post('/community/posts', auth_middleware_1.auth, writes, handle(req => repo.createPost(req.user.id, v.communityPostInput.parse(req.body))));
router.delete('/community/posts/:id', auth_middleware_1.auth, writes, handle(req => repo.removePost(id(req), req.user.id)));
router.patch('/community/posts/:id', auth_middleware_1.auth, writes, handle(req => repo.editPost(id(req), req.user.id, v.communityEditInput.parse(req.body).content)));
for (const kind of ['like', 'save']) {
    router.post(`/community/posts/:id/${kind}`, auth_middleware_1.auth, writes, handle(req => repo.reaction(id(req), req.user.id, kind, true)));
    router.delete(`/community/posts/:id/${kind}`, auth_middleware_1.auth, writes, handle(req => repo.reaction(id(req), req.user.id, kind, false)));
}
router.get('/community/posts/:id/comments', auth_middleware_1.optionalAuth, handle(req => { const q = v.communityQuery.parse(req.query); return repo.comments(id(req), req.user?.id, q.limit, q.offset); }));
router.post('/community/posts/:id/comments', auth_middleware_1.auth, writes, handle(req => repo.addComment(id(req), req.user.id, v.communityCommentInput.parse(req.body))));
router.delete('/community/comments/:id', auth_middleware_1.auth, writes, handle(req => repo.mutateComment(id(req), req.user.id)));
router.patch('/community/comments/:id', auth_middleware_1.auth, writes, handle(req => repo.mutateComment(id(req), req.user.id, v.communityCommentInput.parse(req.body).content)));
router.post('/community/posts/:id/vote', auth_middleware_1.auth, writes, handle(req => repo.vote(id(req), req.user.id, v.communityVoteInput.parse(req.body).option_index)));
exports.default = router;
