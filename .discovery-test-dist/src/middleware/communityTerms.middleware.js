"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMUNITY_TERMS_VERSION = void 0;
exports.enforceCommunityTerms = enforceCommunityTerms;
const ApiError_1 = require("../utils/ApiError");
exports.COMMUNITY_TERMS_VERSION = '2026-09-14';
function enforceCommunityTerms(request) {
    if (!['POST', 'PUT', 'PATCH'].includes(request.method))
        return;
    const isContentWrite = /^\/(stories|chapters|panels|uploads|imports)(\/|$)/.test(request.path)
        || (/^\/community\/(posts|comments)(\/[^/]+)?(\/comments)?$/.test(request.path))
        || (request.method === 'PATCH' && request.path === '/users/me');
    const isReadingAction = /\/(like|views|progress|read|reads|bookmark)$/.test(request.path);
    if (isContentWrite && !isReadingAction && request.user?.app_metadata?.community_terms_version !== exports.COMMUNITY_TERMS_VERSION) {
        throw new ApiError_1.ApiError(403, 'Accept the Community Terms in Settings before creating or uploading content.');
    }
}
