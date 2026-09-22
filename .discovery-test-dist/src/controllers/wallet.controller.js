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
exports.getWallet = getWallet;
exports.listTransactions = listTransactions;
exports.listAchievements = listAchievements;
exports.listChallenges = listChallenges;
const walletService = __importStar(require("../services/wallet.service"));
const zod_1 = require("zod");
const limitSchema = zod_1.z.coerce.number().int().min(1).max(100).optional();
async function getWallet(request, response) {
    response.json({ data: await walletService.getWallet(request.user.id) });
}
async function listTransactions(request, response) {
    const limit = limitSchema.parse(request.query.limit);
    response.json({ data: await walletService.listTransactions(request.user.id, limit) });
}
async function listAchievements(request, response) {
    response.json({ data: await walletService.listAchievements(request.user.id) });
}
async function listChallenges(request, response) {
    response.json({ data: await walletService.listActiveChallenges(request.user.id) });
}
