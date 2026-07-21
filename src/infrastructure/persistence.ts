/**
 * localStorage adapter (D11). Only this file touches localStorage.
 *
 * Versioned key; load validates the snapshot shape and returns null on
 * anything missing/corrupt so the app falls back to the seed state.
 *
 * Owned by: P3 (integration).
 */
import type { AppState } from '../domain/types'
import { AGENT_IDS } from '../domain/types'

export const STORAGE_KEY = 'pocket-coo/v1'

const CARD_STATUSES = ['pending', 'approved', 'rejected', 'delegated', 'delayed']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Minimal structural validation: enough to guarantee the reducer/selectors
 *  and presentation components will not crash on a loaded snapshot. */
function isValidState(value: unknown): value is AppState {
  if (!isRecord(value)) return false
  const { cards, agents } = value as { cards?: unknown; agents?: unknown }

  if (!Array.isArray(cards)) return false
  for (const card of cards) {
    if (!isRecord(card)) return false
    if (typeof card.id !== 'string') return false
    if (typeof card.title !== 'string') return false
    if (typeof card.createdAt !== 'number') return false
    if (!AGENT_IDS.includes(card.agentId as (typeof AGENT_IDS)[number])) return false
    if (!CARD_STATUSES.includes(card.status as string)) return false
  }

  if (!isRecord(agents)) return false
  for (const id of AGENT_IDS) {
    const agent = agents[id]
    if (!isRecord(agent)) return false
    if (!isRecord(agent.status)) return false
    if (typeof agent.status.message !== 'string') return false
  }
  return true
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota/privacy-mode failures are non-fatal: the app keeps working in memory.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore — worst case the old snapshot is overwritten on the next save.
  }
}
