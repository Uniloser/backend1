"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storyIdSchema = void 0;
const { z } = require('zod');
exports.storyIdSchema = z.string().uuid();
// Like Zod schema stub.
// TODO: validate story route ids and optional viewer-state query parameters.
