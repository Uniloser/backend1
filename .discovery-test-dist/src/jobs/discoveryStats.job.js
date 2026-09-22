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
exports.refreshDiscoveryStats = refreshDiscoveryStats;
const repository = __importStar(require("../repositories/discovery.repository"));
const ranking_1 = require("../discovery/ranking");
// Run from a single scheduled worker. Keyset batches avoid API row caps and request-time aggregates.
async function refreshDiscoveryStats() {
    let after = null, count = 0;
    const now = Date.now();
    for (;;) {
        const rows = await repository.metricsBatch(after);
        if (!rows.length)
            break;
        await repository.saveStats(rows.map(({ story_id, metrics }) => ({ story_id, metrics, trending_score: (0, ranking_1.trendingScore)(metrics, now), rising_score: (0, ranking_1.risingScore)(metrics, now), hidden_gem_score: (0, ranking_1.hiddenGemScore)(metrics), quality_score: (0, ranking_1.qualityScore)(metrics), updated_at: new Date(now).toISOString() })));
        count += rows.length;
        after = rows[rows.length - 1].story_id;
    }
    return count;
}
