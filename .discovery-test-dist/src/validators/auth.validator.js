"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUpSchema = exports.signInSchema = void 0;
const { z } = require('zod');
exports.signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
});
exports.signUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    username: z.string().trim().min(3).max(30).regex(/^[a-z0-9_]+$/i),
});
