export const DISCOVERY_CONFIG = {
  version: '1',
  trending: { readers: 1, likes: 3, bookmarks: 5, comments: 4, followers: 5, decay: 0.05 },
  rising: { maxAgeDays: 90, minReaders: 5, readers: 1, likes: 3, bookmarks: 5, comments: 3, followers: 5, retention: 100, growth: 10, growthPrior: 10 },
  hiddenGems: { minReaders: 30, maxReaders: 5000, priorReaders: 30, priorRate: 0.1, completion: 0.30, retention: 0.25, bookmarks: 0.20, likes: 0.15, comments: 0.10 },
  recommendation: { genre: 0.25, tags: 0.25, collaborative: 0.20, quality: 0.15, freshness: 0.10, author: 0.05 },
  interests: { open: 1, chapter: 2, multiple: 3, like: 4, bookmark: 5, follow: 5, complete: 7, halfLifeDays: 60, prior: 5 },
  limits: { candidates: 100, shelf: 15, maxShelf: 30, maxAuthor: 2, maxGenreFraction: 0.4, minShelf: 3, genreShelves: 3, profile: 200, peers: 100, maxOffset: 300 },
  exploration: { fraction: 0.1, maxAgeDays: 30 },
  cache: { globalSeconds: 300, sessionSeconds: 900, maxLocalEntries: 1000 },
} as const;
