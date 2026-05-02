import type { ScoreComputationResult, ScoreSnapshot } from "@/lib/types";

interface LiveCache {
  lastResult: ScoreComputationResult | null;
  snapshots: ScoreSnapshot[];
}

const globalCache = globalThis as typeof globalThis & {
  __fantasyCache?: LiveCache;
};

if (!globalCache.__fantasyCache) {
  globalCache.__fantasyCache = {
    lastResult: null,
    snapshots: [],
  };
}

export function getLiveCache() {
  return globalCache.__fantasyCache!;
}

export function setLiveResult(result: ScoreComputationResult) {
  const cache = getLiveCache();
  cache.lastResult = result;
  cache.snapshots.push(result.snapshot);

  // Keep snapshots bounded to avoid memory growth in long-running environments.
  if (cache.snapshots.length > 200) {
    cache.snapshots = cache.snapshots.slice(-200);
  }
}
