"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotificationsQuerySchema = exports.notificationIdSchema = void 0;
const { z } = require('zod');
exports.notificationIdSchema = z.string().uuid();
exports.listNotificationsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
