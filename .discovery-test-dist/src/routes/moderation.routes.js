"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireModerator = requireModerator;
const auth_middleware_1 = require("../middleware/auth.middleware");
const supabase_1 = require("../config/supabase");
const ApiError_1 = require("../utils/ApiError");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = require('express').Router();
const { z } = require('zod');
function requireModerator(request, _response, next) {
    const role = request.user?.app_metadata?.role;
    if (role !== 'moderator' && role !== 'admin')
        return next(new ApiError_1.ApiError(403, 'Moderator access required.'));
    next();
}
router.get('/moderation/reports', auth_middleware_1.auth, requireModerator, (0, asyncHandler_1.asyncHandler)(async (_request, response) => {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)().from('reports').select('id, category, description, story_id, chapter_id, comment_id, reported_user_id, status, created_at').in('status', ['open', 'in_review']).order('created_at', { ascending: true }).limit(50);
    if (error)
        throw error;
    response.json({ data });
}));
router.patch('/moderation/reports/:id', auth_middleware_1.auth, requireModerator, (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = z.string().uuid().parse(request.params.id);
    const input = z.object({ action: z.enum(['remove_content', 'restrict_user', 'dismiss']), reason: z.string().trim().min(10).max(2000) }).parse(request.body);
    const admin = (0, supabase_1.getSupabaseAdmin)();
    const { data: report, error } = await admin.from('reports').select('*').eq('id', id).single();
    if (error || !report)
        throw new ApiError_1.ApiError(404, 'Report not found');
    if (report.status === 'resolved' || report.status === 'dismissed')
        throw new ApiError_1.ApiError(409, 'This report was already reviewed.');
    if (input.action === 'remove_content') {
        const target = report.story_id ? ['stories', report.story_id] : report.chapter_id ? ['chapters', report.chapter_id] : report.comment_id ? ['comments', report.comment_id] : undefined;
        if (!target)
            throw new ApiError_1.ApiError(400, 'This report has no content to remove.');
        const { error: removeError } = await admin.from(target[0]).delete().eq('id', target[1]);
        if (removeError)
            throw removeError;
    }
    else if (input.action === 'restrict_user') {
        if (!report.reported_user_id || report.reported_user_id === request.user.id)
            throw new ApiError_1.ApiError(400, 'A different reported user is required.');
        const { data: target } = await admin.auth.admin.getUserById(report.reported_user_id);
        if (['admin', 'moderator'].includes(target?.user?.app_metadata?.role))
            throw new ApiError_1.ApiError(403, 'Staff account restrictions require an administrator review outside this tool.');
        const { error: banError } = await admin.auth.admin.updateUserById(report.reported_user_id, { ban_duration: '876000h' });
        if (banError)
            throw banError;
    }
    const { data, error: reviewError } = await admin.from('reports').update({ status: input.action === 'dismiss' ? 'dismissed' : 'resolved', resolution_note: `${input.action}: ${input.reason}`, assigned_to: request.user.id, reviewed_at: new Date().toISOString() }).eq('id', id).select('id, status').single();
    if (reviewError)
        throw reviewError;
    response.json({ data });
}));
exports.default = router;
