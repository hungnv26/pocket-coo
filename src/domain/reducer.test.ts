import { describe, expect, it } from 'vitest'
import type { ApprovalCard, AppState } from './types'
import { MAX_PENDING } from './types'
import { reducer } from './reducer'
import { seedState } from './seed'
import { pendingCards } from './selectors'

const NOW = 1_700_000_000_000
const LATER = NOW + 5_000

const base = (): AppState => seedState(NOW)

function makeCard(id: string, overrides: Partial<ApprovalCard> = {}): ApprovalCard {
  return {
    id,
    agentId: 'backend',
    title: `Card ${id}`,
    summary: 'A test card.',
    confidence: 80,
    impact: 'test impact',
    urgency: 'low',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning: 'Because tests.',
    details: 'Full details.',
    createdAt: NOW,
    status: 'pending',
    ...overrides,
  }
}

describe('reducer DECIDE', () => {
  it('approve sets status approved with resolution timestamp', () => {
    const next = reducer(base(), { type: 'DECIDE', cardId: 'card-backend-1', decision: { kind: 'approve' }, now: LATER })
    const card = next.cards.find((c) => c.id === 'card-backend-1')!
    expect(card.status).toBe('approved')
    expect(card.resolution).toEqual({ decidedAt: LATER })
  })

  it('reject sets status rejected', () => {
    const next = reducer(base(), { type: 'DECIDE', cardId: 'card-qa-1', decision: { kind: 'reject' }, now: LATER })
    expect(next.cards.find((c) => c.id === 'card-qa-1')!.status).toBe('rejected')
  })

  it('delegate to an agent sets status delegated with target', () => {
    const next = reducer(base(), {
      type: 'DECIDE',
      cardId: 'card-finance-1',
      decision: { kind: 'delegate', target: 'qa' },
      now: LATER,
    })
    const card = next.cards.find((c) => c.id === 'card-finance-1')!
    expect(card.status).toBe('delegated')
    expect(card.resolution).toEqual({ decidedAt: LATER, target: 'qa' })
  })

  it("delegate to 'tomorrow' sets status delayed", () => {
    const next = reducer(base(), {
      type: 'DECIDE',
      cardId: 'card-marketing-1',
      decision: { kind: 'delegate', target: 'tomorrow' },
      now: LATER,
    })
    const card = next.cards.find((c) => c.id === 'card-marketing-1')!
    expect(card.status).toBe('delayed')
    expect(card.resolution).toEqual({ decidedAt: LATER, target: 'tomorrow' })
  })

  it('unknown card id is a no-op (same state reference)', () => {
    const state = base()
    expect(reducer(state, { type: 'DECIDE', cardId: 'card-nope-99', decision: { kind: 'approve' }, now: LATER })).toBe(state)
  })

  it('deciding an already-decided card is a no-op', () => {
    const once = reducer(base(), { type: 'DECIDE', cardId: 'card-backend-1', decision: { kind: 'reject' }, now: LATER })
    const twice = reducer(once, { type: 'DECIDE', cardId: 'card-backend-1', decision: { kind: 'approve' }, now: LATER + 1 })
    expect(twice).toBe(once)
    expect(twice.cards.find((c) => c.id === 'card-backend-1')!.status).toBe('rejected')
  })
})

describe('reducer BULK_APPROVE_LOW_RISK', () => {
  it('approves every pending low-risk card and nothing else', () => {
    const state = base()
    const lowRisk = pendingCards(state).filter((c) => c.risk === 'low')
    expect(lowRisk.length).toBeGreaterThan(0)

    const next = reducer(state, { type: 'BULK_APPROVE_LOW_RISK', now: LATER })
    expect(pendingCards(next).filter((c) => c.risk === 'low')).toHaveLength(0)
    expect(next.cards.filter((c) => c.status === 'approved')).toHaveLength(lowRisk.length)
    // non-low-risk cards untouched
    expect(pendingCards(next)).toHaveLength(pendingCards(state).length - lowRisk.length)
  })

  it('is a no-op when no pending low-risk cards exist', () => {
    const once = reducer(base(), { type: 'BULK_APPROVE_LOW_RISK', now: LATER })
    expect(reducer(once, { type: 'BULK_APPROVE_LOW_RISK', now: LATER + 1 })).toBe(once)
  })
})

describe('reducer REJECT_MATCH', () => {
  it('rejects pending cards matching agent + keyword', () => {
    const next = reducer(base(), { type: 'REJECT_MATCH', agentId: 'marketing', keyword: 'campaign', now: LATER })
    const rejected = next.cards.filter((c) => c.status === 'rejected')
    expect(rejected.length).toBeGreaterThanOrEqual(2)
    expect(rejected.every((c) => c.agentId === 'marketing')).toBe(true)
    expect(rejected.every((c) => `${c.title} ${c.summary}`.toLowerCase().includes('campaign'))).toBe(true)
  })

  it('matches keyword across all agents when agentId is omitted', () => {
    const next = reducer(base(), { type: 'REJECT_MATCH', keyword: 'newsletter', now: LATER })
    expect(next.cards.filter((c) => c.status === 'rejected').length).toBeGreaterThanOrEqual(1)
  })

  it('is a no-op when nothing matches', () => {
    const state = base()
    expect(reducer(state, { type: 'REJECT_MATCH', agentId: 'qa', keyword: 'zeppelin', now: LATER })).toBe(state)
  })
})

describe('reducer CARD_ARRIVED', () => {
  it('appends a new card below the cap', () => {
    const card = makeCard('card-gen-1-0')
    const next = reducer(base(), { type: 'CARD_ARRIVED', card })
    expect(next.cards).toHaveLength(21)
    expect(next.cards.at(-1)!.id).toBe('card-gen-1-0')
  })

  it(`drops the card when pending count is at the cap (${MAX_PENDING})`, () => {
    let state = base()
    for (let i = 0; i < MAX_PENDING - 20; i += 1) {
      state = reducer(state, { type: 'CARD_ARRIVED', card: makeCard(`card-gen-fill-${i}`) })
    }
    expect(pendingCards(state)).toHaveLength(MAX_PENDING)
    expect(reducer(state, { type: 'CARD_ARRIVED', card: makeCard('card-gen-overflow') })).toBe(state)
  })

  it('drops duplicate ids', () => {
    const state = base()
    expect(reducer(state, { type: 'CARD_ARRIVED', card: makeCard('card-backend-1') })).toBe(state)
  })
})

describe('reducer AGENT_STATUS', () => {
  it('updates exactly one agent status line', () => {
    const status = { state: 'working' as const, message: 'Deploying v2.1…', updatedAt: LATER }
    const next = reducer(base(), { type: 'AGENT_STATUS', agentId: 'backend', status })
    expect(next.agents.backend.status).toEqual(status)
    expect(next.agents.qa.status.updatedAt).toBe(NOW)
  })
})

describe('reducer RESET', () => {
  it('replaces state wholesale', () => {
    const decided = reducer(base(), { type: 'DECIDE', cardId: 'card-backend-1', decision: { kind: 'approve' }, now: LATER })
    const fresh = seedState(LATER)
    const next = reducer(decided, { type: 'RESET', state: fresh })
    expect(next).toBe(fresh)
    expect(pendingCards(next)).toHaveLength(20)
  })
})
