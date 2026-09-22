"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIdSchema = void 0;
const { z } = require('zod');
exports.userIdSchema = z.string().uuid();
