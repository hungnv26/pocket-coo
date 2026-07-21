/**
 * Pure selectors over AppState. No React, no browser APIs.
 * Owned by: P1 (core logic). Stub only in scaffold.
 */
import type { ApprovalCard, AppState, QueueCounts } from './types'

/** Pending cards, newest-arrival-last (inbox top = index 0 = oldest). */
export function pendingCards(state: AppState): ApprovalCard[] {
  // TODO(P1)
  return state.cards.filter((c) => c.status === 'pending')
}

export function queueCounts(state: AppState): QueueCounts {
  // TODO(P1): critical = pending && (risk === 'high' || urgency === 'high')
  return { pending: pendingCards(state).length, critical: 0, delayed: 0 }
}

/** Most recent pending card for an agent (for "Ask Backend why…"). */
export function latestPendingForAgent(state: AppState, agentId: string): ApprovalCard | undefined {
  // TODO(P1)
  return pendingCards(state).find((c) => c.agentId === agentId)
}
