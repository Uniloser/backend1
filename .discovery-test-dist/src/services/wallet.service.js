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
exports.listActiveChallenges = listActiveChallenges;
exports.awardGems = awardGems;
const walletRepository = __importStar(require("../repositories/wallet.repository"));
function getWallet(userId) {
    return walletRepository.getWallet(userId);
}
function listTransactions(userId, limit) {
    return walletRepository.listTransactions(userId, limit);
}
function listAchievements(userId) {
    return walletRepository.listAchievements(userId);
}
function listActiveChallenges(userId) {
    return walletRepository.listActiveChallenges(userId);
}
function awardGems(input) {
    return walletRepository.applyGemTransaction(input);
}
