"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
function asyncHandler(handler) {
    return (...argumentsList) => Promise.resolve(handler(...argumentsList)).catch(argumentsList[2]);
}
// Async Express handler wrapper stub.
// TODO: forward rejected promises to next(error) so controllers stay free of
// repetitive try/catch blocks.
