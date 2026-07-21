/**
 * Seed fixture: exactly 20 pending cards (D8) across all 5 agents and all 3
 * risk levels, plus initial agent statuses. Deterministic (fixed content) so
 * QA checks are repeatable. Pure TS.
 *
 * Owned by: P1 (core logic). Stub only in scaffold.
 */
import type { AppState } from './types'
import { AGENT_IDS, AGENT_NAMES } from './types'

export function seedState(now: number): AppState {
  // TODO(P1): 20 pending ApprovalCards. Must include:
  // - at least one card per agent, all three risk levels represented
  // - at least 2 Marketing cards whose title/summary contains "campaign"
  //   (needed by the `Reject marketing campaign` command check)
  // - at least 1 pending Backend card (for `Ask Backend why this changed`)
  // - non-empty reasoning and details on every card
  return {
    cards: [],
    agents: Object.fromEntries(
      AGENT_IDS.map((id) => [
        id,
        { id, name: AGENT_NAMES[id], status: { state: 'idle' as const, message: 'Idle', updatedAt: now } },
      ]),
    ) as AppState['agents'],
  }
}
