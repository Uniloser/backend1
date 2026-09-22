import { refreshDiscoveryStats } from '../src/jobs/discoveryStats.job';
refreshDiscoveryStats().then(count=>{ console.log(`Refreshed discovery statistics for ${count} stories`); process.exit(0); }).catch(error=>{ console.error(error); process.exit(1); });
