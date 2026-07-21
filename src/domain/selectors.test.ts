import { describe, expect, it } from 'vitest'
import { reducer } from './reducer'
import { seedState } from './seed'
import { latestPendingForAgent, pendingCards, queueCounts } from './selectors'

const NOW = 1_700_000_000_000
const LATER = NOW + 5_000

describe('pendingCards', () => {
  it('returns only pending cards, oldest first (inbox top = index 0)', () => {
    const state = seedState(NOW)
    const pending = pendingCards(state)
    expect(pending).toHaveLength(20)
    for (let i = 1; i < pending.length; i += 1) {
      expect(pending[i].createdAt).toBeGreaterThanOrEqual(pending[i - 1].createdAt)
    }
  })

  it('sorts by createdAt even when the cards array is out of order', () => {
    const state = seedState(NOW)
    const shuffled = { ...state, cards: [...state.cards].reverse() }
    expect(pendingCards(shuffled).map((c) => c.id)).toEqual(pendingCards(state).map((c) => c.id))
  })

  it('excludes decided cards', () => {
    const next = reducer(seedState(NOW), {
      type: 'DECIDE',
      cardId: 'card-backend-1',
      decision: { kind: 'approve' },
      now: LATER,
    })
    expect(pendingCards(next)).toHaveLength(19)
    expect(pendingCards(next).some((c) => c.id === 'card-backend-1')).toBe(false)
  })
})

describe('queueCounts', () => {
  it('counts pending, critical (risk high OR urgency high), and delayed on the seed', () => {
    const state = seedState(NOW)
    const counts = queueCounts(state)
    expect(counts.pending).toBe(20)
    const expectedCritical = pendingCards(state).filter((c) => c.risk === 'high' || c.urgency === 'high').length
    expect(counts.critical).toBe(expectedCritical)
    expect(counts.critical).toBeGreaterThan(0)
    expect(counts.delayed).toBe(0)
  })

  it('moves a delayed card from pending to delayed', () => {
    const next = reducer(seedState(NOW), {
      type: 'DECIDE',
      cardId: 'card-qa-1',
      decision: { kind: 'delegate', target: 'tomorrow' },
      now: LATER,
    })
    const counts = queueCounts(next)
    expect(counts.pending).toBe(19)
    expect(counts.delayed).toBe(1)
  })

  it('critical count drops when a critical card is decided', () => {
    const state = seedState(NOW)
    const critical = pendingCards(state).find((c) => c.risk === 'high' || c.urgency === 'high')!
    const next = reducer(state, { type: 'DECIDE', cardId: critical.id, decision: { kind: 'approve' }, now: LATER })
    expect(queueCounts(next).critical).toBe(queueCounts(state).critical - 1)
  })
})

describe('latestPendingForAgent', () => {
  it('returns the most recent pending card for the agent', () => {
    const state = seedState(NOW)
    const backendPending = pendingCards(state).filter((c) => c.agentId === 'backend')
    expect(latestPendingForAgent(state, 'backend')!.id).toBe(backendPending.at(-1)!.id)
  })

  it('skips decided cards', () => {
    const state = seedState(NOW)
    const latest = latestPendingForAgent(state, 'backend')!
    const next = reducer(state, { type: 'DECIDE', cardId: latest.id, decision: { kind: 'approve' }, now: LATER })
    const newLatest = latestPendingForAgent(next, 'backend')!
    expect(newLatest.id).not.toBe(latest.id)
    expect(newLatest.agentId).toBe('backend')
  })

  it('returns undefined for an unknown agent or when nothing is pending', () => {
    const state = seedState(NOW)
    expect(latestPendingForAgent(state, 'design')).toBeUndefined()
    const cleared = reducer(state, { type: 'REJECT_MATCH', agentId: 'qa', keyword: '', now: LATER })
    expect(latestPendingForAgent(cleared, 'qa')).toBeUndefined()
  })
})
