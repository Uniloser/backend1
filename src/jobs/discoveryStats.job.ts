import * as repository from '../repositories/discovery.repository';
import { hiddenGemScore, qualityScore, risingScore, trendingScore } from '../discovery/ranking';
// Run from a single scheduled worker. Keyset batches avoid API row caps and request-time aggregates.
export async function refreshDiscoveryStats() {
  let after:string|null=null, count=0;
  const now=Date.now();
  for(;;) {
    const rows=await repository.metricsBatch(after);
    if(!rows.length) break;
    await repository.saveStats(rows.map(({story_id,metrics})=>({story_id,metrics,trending_score:trendingScore(metrics,now),rising_score:risingScore(metrics,now),hidden_gem_score:hiddenGemScore(metrics),quality_score:qualityScore(metrics),updated_at:new Date(now).toISOString()})));
    count+=rows.length; after=rows[rows.length-1].story_id;
  }
  return count;
}
