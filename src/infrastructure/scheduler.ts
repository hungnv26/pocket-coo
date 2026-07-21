/**
 * Timer adapter: drives the pure agent engine with real setTimeout calls.
 * Only this file (plus React internals) owns timers.
 *
 * Owned by: P3 (integration).
 */

export interface Scheduler {
  /** Schedule fn after ms; returns a cancel function. */
  schedule(fn: () => void, ms: number): () => void
  cancelAll(): void
}

export function createScheduler(): Scheduler {
  const handles = new Set<ReturnType<typeof setTimeout>>()

  return {
    schedule(fn, ms) {
      const handle = setTimeout(() => {
        handles.delete(handle)
        fn()
      }, ms)
      handles.add(handle)
      return () => {
        clearTimeout(handle)
        handles.delete(handle)
      }
    },
    cancelAll() {
      for (const handle of handles) clearTimeout(handle)
      handles.clear()
    },
  }
}
