import { auth } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import * as account from '../repositories/account.repository';
import { COMMUNITY_TERMS_VERSION } from '../middleware/communityTerms.middleware';
const router = require('express').Router();

router.delete('/users/me/account', authRateLimit, auth, asyncHandler(async (request: any, response: any) => {
	if (request.body?.confirmation !== 'DELETE') throw new ApiError(400, 'Type DELETE to confirm permanent account deletion.');
	await account.deleteAccount(request.user.id);
	response.json({ data: { deleted: true } });
}));
router.post('/users/me/community-terms', auth, asyncHandler(async (request: any, response: any) => {
	if (request.body?.version !== COMMUNITY_TERMS_VERSION || request.body?.accepted !== true) throw new ApiError(400, 'Please accept the current community terms.');
	await account.acceptCommunityTerms(request.user.id, COMMUNITY_TERMS_VERSION);
	response.json({ data: { accepted: true } });
}));
export default router;
