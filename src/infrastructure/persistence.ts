/**
 * localStorage adapter (D11). Only this file touches localStorage.
 *
 * Owned by: P3 (integration). Stub only in scaffold.
 */
import type { AppState } from '../domain/types'

export const STORAGE_KEY = 'pocket-coo/v1'

export function loadState(): AppState | null {
  // TODO(P3): JSON.parse with try/catch; return null on missing/corrupt data.
  return null
}

export function saveState(_state: AppState): void {
  // TODO(P3)
}

export function clearState(): void {
  // TODO(P3): used by "Reset demo".
}
