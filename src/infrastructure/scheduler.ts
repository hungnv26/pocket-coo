/**
 * Timer adapter: drives the pure agent engine with real setTimeout calls.
 * Only this file (plus React internals) owns timers.
 *
 * Owned by: P3 (integration). Stub only in scaffold.
 */

export interface Scheduler {
  /** Schedule fn after ms; returns a cancel function. */
  schedule(fn: () => void, ms: number): () => void
  cancelAll(): void
}

export function createScheduler(): Scheduler {
  // TODO(P3): wrap setTimeout/clearTimeout, track handles for cancelAll.
  const noop = () => {}
  return { schedule: () => noop, cancelAll: noop }
}
