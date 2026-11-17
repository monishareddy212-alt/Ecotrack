type InvalidationListener = () => void;

const listeners = new Set<InvalidationListener>();
let revision = 0;

export function getAnalyticsRevision(): number {
  return revision;
}

export function invalidateAnalyticsData(): void {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAnalyticsInvalidation(listener: InvalidationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
