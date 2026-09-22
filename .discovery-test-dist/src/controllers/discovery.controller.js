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
exports.discover = discover;
exports.preferences = preferences;
exports.events = events;
const zod_1 = require("zod");
const config_1 = require("../discovery/config");
const service = __importStar(require("../services/discovery.service"));
const repository = __importStar(require("../repositories/discovery.repository"));
const query = zod_1.z.object({ limit: zod_1.z.coerce.number().int().min(1).max(config_1.DISCOVERY_CONFIG.limits.maxShelf).default(config_1.DISCOVERY_CONFIG.limits.shelf), cursor: zod_1.z.string().max(1000).optional() });
async function discover(req, res) {
    const input = query.parse(req.query);
    res.set('Cache-Control', 'private, no-store');
    res.json({ data: input.cursor ? await service.loadMore(input.cursor, req.user?.id, input.limit) : await service.discover(req.user?.id, input.limit) });
}
async function preferences(req, res) {
    const input = zod_1.z.object({ genres: zod_1.z.array(zod_1.z.string().trim().min(1).max(80)).max(10), tags: zod_1.z.array(zod_1.z.string().trim().min(1).max(80)).max(20), allowMature: zod_1.z.boolean().default(false) }).strict().parse(req.body);
    res.json({ data: await repository.savePreferences(req.user.id, input) });
}
async function events(req, res) {
    const input = zod_1.z.object({ sessionId: zod_1.z.string().uuid(), events: zod_1.z.array(zod_1.z.object({ event: zod_1.z.enum(['discovery_shelf_view', 'story_impression', 'story_click', 'story_open']), shelf: zod_1.z.string().min(1).max(100), storyId: zod_1.z.string().uuid().optional(), position: zod_1.z.number().int().min(0).max(config_1.DISCOVERY_CONFIG.limits.maxOffset).optional() }).strict()).min(1).max(50) }).strict().parse(req.body);
    res.json({ data: await service.track(req.user?.id, input) });
}
