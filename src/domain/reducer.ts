/**
 * Domain reducer — the single place state transitions happen.
 * Pure function: (state, action) -> state. No React, no browser APIs.
 * Total: unknown ids / non-pending cards are no-ops; never throws.
 *
 * Owned by: P1 (core logic).
 */
import type { ApprovalCard, AppAction, AppState, Decision } from './types'
import { MAX_PENDING } from './types'

/** Card status produced by a decision. */
function statusForDecision(decision: Decision): ApprovalCard['status'] {
  switch (decision.kind) {
    case 'approve':
      return 'approved'
    case 'reject':
      return 'rejected'
    case 'delegate':
      return decision.target === 'tomorrow' ? 'delayed' : 'delegated'
  }
}

function resolveCard(card: ApprovalCard, decision: Decision, now: number): ApprovalCard {
  return {
    ...card,
    status: statusForDecision(decision),
    resolution: {
      decidedAt: now,
      ...(decision.kind === 'delegate' ? { target: decision.target } : {}),
    },
  }
}

/** Case-insensitive keyword match against a card's title + summary. */
export function cardMatches(card: ApprovalCard, agentId: string | undefined, keyword: string): boolean {
  if (agentId !== undefined && card.agentId !== agentId) return false
  const kw = keyword.trim().toLowerCase()
  if (kw === '') return agentId !== undefined // agent-only match needs an agent filter
  return card.title.toLowerCase().includes(kw) || card.summary.toLowerCase().includes(kw)
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'DECIDE': {
      const card = state.cards.find((c) => c.id === action.cardId)
      if (card === undefined || card.status !== 'pending') return state
      return {
        ...state,
        cards: state.cards.map((c) => (c.id === action.cardId ? resolveCard(c, action.decision, action.now) : c)),
      }
    }

    case 'BULK_APPROVE_LOW_RISK': {
      if (!state.cards.some((c) => c.status === 'pending' && c.risk === 'low')) return state
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.status === 'pending' && c.risk === 'low' ? resolveCard(c, { kind: 'approve' }, action.now) : c,
        ),
      }
    }

    case 'REJECT_MATCH': {
      const hit = (c: ApprovalCard) => c.status === 'pending' && cardMatches(c, action.agentId, action.keyword)
      if (!state.cards.some(hit)) return state
      return {
        ...state,
        cards: state.cards.map((c) => (hit(c) ? resolveCard(c, { kind: 'reject' }, action.now) : c)),
      }
    }

    case 'CARD_ARRIVED': {
      const pending = state.cards.filter((c) => c.status === 'pending').length
      if (pending >= MAX_PENDING) return state
      if (state.cards.some((c) => c.id === action.card.id)) return state // ids are unique
      return { ...state, cards: [...state.cards, action.card] }
    }

    case 'AGENT_STATUS': {
      const agent = state.agents[action.agentId]
      if (agent === undefined) return state
      return {
        ...state,
        agents: { ...state.agents, [action.agentId]: { ...agent, status: action.status } },
      }
    }

    case 'RESET':
      return action.state

    default:
      return state
  }
}
