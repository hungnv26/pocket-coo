import { describe, expect, it } from 'vitest'
import { AGENT_IDS, SEED_CARD_COUNT } from './types'
import { seedState } from './seed'
import { pendingCards } from './selectors'

const NOW = 1_700_000_000_000

describe('seedState invariants (D8 + PLAN P1.3)', () => {
  const state = seedState(NOW)
  const cards = state.cards

  it(`has exactly ${SEED_CARD_COUNT} cards, all pending`, () => {
    expect(cards).toHaveLength(SEED_CARD_COUNT)
    expect(pendingCards(state)).toHaveLength(SEED_CARD_COUNT)
  })

  it('has unique, convention-following ids', () => {
    expect(new Set(cards.map((c) => c.id)).size).toBe(SEED_CARD_COUNT)
    for (const card of cards) {
      expect(card.id).toMatch(new RegExp(`^card-${card.agentId}-\\d+$`))
    }
  })

  it('gives every agent at least 2 cards', () => {
    for (const agentId of AGENT_IDS) {
      expect(cards.filter((c) => c.agentId === agentId).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('covers all three risk levels', () => {
    expect(new Set(cards.map((c) => c.risk))).toEqual(new Set(['low', 'medium', 'high']))
  })

  it('has at least 2 Marketing cards matching "campaign" (for the reject command)', () => {
    const campaigns = cards.filter(
      (c) => c.agentId === 'marketing' && `${c.title} ${c.summary}`.toLowerCase().includes('campaign'),
    )
    expect(campaigns.length).toBeGreaterThanOrEqual(2)
  })

  it('has at least 1 pending Backend card (for the explain command)', () => {
    expect(cards.some((c) => c.agentId === 'backend')).toBe(true)
  })

  it('has non-empty reasoning and details on every card', () => {
    for (const card of cards) {
      expect(card.reasoning.trim().length).toBeGreaterThan(0)
      expect(card.details.trim().length).toBeGreaterThan(0)
    }
  })

  it('has all seven display fields populated on every card', () => {
    for (const card of cards) {
      expect(card.title.trim()).not.toBe('')
      expect(card.summary.trim()).not.toBe('')
      expect(card.confidence).toBeGreaterThanOrEqual(0)
      expect(card.confidence).toBeLessThanOrEqual(100)
      expect(card.impact.trim()).not.toBe('')
      expect(['low', 'medium', 'high']).toContain(card.urgency)
      expect(['approve', 'reject', 'review']).toContain(card.recommendedAction)
    }
  })

  it('orders createdAt oldest-first and in the past relative to now', () => {
    for (let i = 0; i < cards.length; i += 1) {
      expect(cards[i].createdAt).toBeLessThan(NOW)
      if (i > 0) expect(cards[i].createdAt).toBeGreaterThan(cards[i - 1].createdAt)
    }
  })

  it('is deterministic for a fixed now', () => {
    expect(seedState(NOW)).toEqual(seedState(NOW))
  })

  it('initializes all five agents with sensible statuses', () => {
    for (const agentId of AGENT_IDS) {
      const agent = state.agents[agentId]
      expect(agent.id).toBe(agentId)
      expect(agent.name.trim()).not.toBe('')
      expect(['working', 'waiting_approval']).toContain(agent.status.state)
      expect(agent.status.message.trim()).not.toBe('')
      expect(agent.status.updatedAt).toBe(NOW)
    }
  })
})
