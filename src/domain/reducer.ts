/**
 * Domain reducer — the single place state transitions happen.
 * Pure function: (state, action) -> state. No React, no browser APIs.
 *
 * Owned by: P1 (core logic). Stub only in scaffold.
 */
import type { AppAction, AppState } from './types'

export function reducer(state: AppState, _action: AppAction): AppState {
  // TODO(P1): implement all AppAction transitions.
  // - DECIDE: set card status (approve/reject/delegate/delayed) + resolution.
  // - BULK_APPROVE_LOW_RISK: approve all pending risk==='low' cards.
  // - REJECT_MATCH: reject pending card(s) matching agent + keyword.
  // - CARD_ARRIVED: append if pending count < MAX_PENDING.
  // - AGENT_STATUS: update one agent's status line.
  // - RESET: replace state wholesale.
  return state
}
