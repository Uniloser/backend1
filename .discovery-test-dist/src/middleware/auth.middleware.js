"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.auth = void 0;
const supabase_1 = require("../config/supabase");
const ApiError_1 = require("../utils/ApiError");
const communityTerms_middleware_1 = require("./communityTerms.middleware");
function getBearerToken(request) {
    const authorization = request.get('authorization');
    if (!authorization) {
        return undefined;
    }
    const [scheme, token] = authorization.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        throw new ApiError_1.ApiError(401, 'Authorization must use the Bearer scheme');
    }
    return token;
}
async function verifyUser(token) {
    const { data, error } = await supabase_1.supabase.auth.getUser(token);
    if (error || !data.user) {
        throw new ApiError_1.ApiError(401, 'Invalid or expired access token');
    }
    return data.user;
}
const auth = async (request, _response, next) => {
    try {
        const token = getBearerToken(request);
        if (!token) {
            throw new ApiError_1.ApiError(401, 'Authentication is required');
        }
        request.user = await verifyUser(token);
        (0, communityTerms_middleware_1.enforceCommunityTerms)(request);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.auth = auth;
const optionalAuth = async (request, _response, next) => {
    try {
        const token = getBearerToken(request);
        if (token) {
            try {
                request.user = await verifyUser(token);
            }
            catch {
                request.user = undefined;
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuth = optionalAuth;
// Required and optional authentication middleware stub.
// TODO: read Authorization: Bearer <token>; reject missing or malformed
// credentials with 401; call supabase.auth.getUser(token); attach the returned
// user to req.user; pass verification failures to the error handler.
// TODO: implement optionalAuth with the same parsing/verification behavior,
// but continue with req.user unset when no header is supplied or the token is
// invalid. Use it for anonymous-versus-authenticated like/profile reads.
