"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const ApiError_1 = require("../utils/ApiError");
function errorHandler(error, _request, response, _next) {
    if (error instanceof ApiError_1.ApiError) {
        response.status(error.statusCode).json({
            error: {
                message: error.message,
                details: error.details,
            },
        });
        return;
    }
    if (error && typeof error === 'object' && 'issues' in error) {
        response.status(400).json({
            error: {
                message: 'Request validation failed',
                details: error.issues,
            },
        });
        return;
    }
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const dbError = error;
        if (dbError.code === '42501') {
            response.status(503).json({
                error: { message: 'Database access is not configured' },
            });
            return;
        }
        if (dbError.code === '23505') {
            response.status(409).json({
                error: { message: 'Resource already exists' },
            });
            return;
        }
        console.error(dbError);
        response.status(500).json({ error: { message: 'Database error' } });
        return;
    }
    console.error(error);
    response.status(500).json({ error: { message: 'Internal server error' } });
}
// Central error-handler stub.
// TODO: normalize ApiError, Zod, Supabase, multer, and unexpected errors into
// stable JSON responses without leaking database details.
