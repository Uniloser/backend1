import { supabase } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

interface Request {
	get(name: string): string | undefined;
	user?: { id: string; [key: string]: unknown };
}

type Response = unknown;
type NextFunction = (error?: unknown) => void;
type RequestHandler = (request: Request, response: Response, next: NextFunction) => void | Promise<void>;

function getBearerToken(request: Request): string | undefined {
	const authorization = request.get('authorization');

	if (!authorization) {
		return undefined;
	}

	const [scheme, token] = authorization.trim().split(/\s+/);

	if (scheme?.toLowerCase() !== 'bearer' || !token) {
		throw new ApiError(401, 'Authorization must use the Bearer scheme');
	}

	return token;
}

async function verifyUser(token: string) {
	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		throw new ApiError(401, 'Invalid or expired access token');
	}

	return data.user;
}

export const auth: RequestHandler = async (
	request: Request,
	_response: Response,
	next: NextFunction,
) => {
	try {
		const token = getBearerToken(request);

		if (!token) {
			throw new ApiError(401, 'Authentication is required');
		}

		request.user = await verifyUser(token);
		next();
	} catch (error) {
		next(error);
	}
};

export const optionalAuth: RequestHandler = async (
	request: Request,
	_response: Response,
	next: NextFunction,
) => {
	try {
		const token = getBearerToken(request);

		if (token) {
			try {
				request.user = await verifyUser(token);
			} catch {
				request.user = undefined;
			}
		}

		next();
	} catch (error) {
		next(error);
	}
};
// Required and optional authentication middleware stub.
// TODO: read Authorization: Bearer <token>; reject missing or malformed
// credentials with 401; call supabase.auth.getUser(token); attach the returned
// user to req.user; pass verification failures to the error handler.
// TODO: implement optionalAuth with the same parsing/verification behavior,
// but continue with req.user unset when no header is supplied or the token is
// invalid. Use it for anonymous-versus-authenticated like/profile reads.
