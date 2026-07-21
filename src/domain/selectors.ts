/**
 * Pure selectors over AppState. No React, no browser APIs.
 * Owned by: P1 (core logic).
 */
import type { ApprovalCard, AppState, QueueCounts } from './types'

/**
 * Pending cards in stable inbox order: oldest first (index 0 = inbox top).
 * Ties on createdAt keep array order (Array.prototype.sort is stable).
 */
export function pendingCards(state: AppState): ApprovalCard[] {
  return state.cards.filter((c) => c.status === 'pending').sort((a, b) => a.createdAt - b.createdAt)
}

/** A pending card is critical when its risk or urgency is high. */
export function isCritical(card: ApprovalCard): boolean {
  return card.risk === 'high' || card.urgency === 'high'
}

export function queueCounts(state: AppState): QueueCounts {
  let pending = 0
  let critical = 0
  let delayed = 0
  for (const card of state.cards) {
    if (card.status === 'pending') {
      pending += 1
      if (isCritical(card)) critical += 1
    } else if (card.status === 'delayed') {
      delayed += 1
    }
  }
  return { pending, critical, delayed }
}

/** Most recent pending card for an agent (for "Ask Backend why this changed"). */
export function latestPendingForAgent(state: AppState, agentId: string): ApprovalCard | undefined {
  let latest: ApprovalCard | undefined
  for (const card of state.cards) {
    if (card.status !== 'pending' || card.agentId !== agentId) continue
    if (latest === undefined || card.createdAt >= latest.createdAt) latest = card
  }
  return latest
}
