"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.unreadCount = unreadCount;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const notificationsService = __importStar(require("../services/notifications.service"));
const notifications_validator_1 = require("../validators/notifications.validator");
async function listNotifications(request, response) {
    const query = notifications_validator_1.listNotificationsQuerySchema.parse(request.query);
    const notifications = await notificationsService.listNotifications(request.user.id, query.limit, query.offset);
    response.json({ data: notifications });
}
async function unreadCount(request, response) {
    const result = await notificationsService.unreadCount(request.user.id);
    response.json({ data: result });
}
async function markRead(request, response) {
    const notificationId = notifications_validator_1.notificationIdSchema.parse(request.params.id);
    const notification = await notificationsService.markRead(request.user.id, notificationId);
    response.json({ data: notification });
}
async function markAllRead(request, response) {
    const result = await notificationsService.markAllRead(request.user.id);
    response.json({ data: result });
}
