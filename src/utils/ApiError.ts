export class ApiError extends Error {
	readonly statusCode: number;
	readonly details?: unknown;

	constructor(statusCode: number, message: string, details?: unknown) {
		super(message);
		this.name = 'ApiError';
		this.statusCode = statusCode;
		this.details = details;
	}
}
// Application error type stub.
// TODO: define a typed error carrying HTTP status, public message, and optional
// details for consistent controller/service failures.
