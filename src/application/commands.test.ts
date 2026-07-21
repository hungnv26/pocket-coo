import { describe, expect, it } from 'vitest'
import type { AppState } from '../domain/types'
import { reducer } from '../domain/reducer'
import { seedState } from '../domain/seed'
import { latestPendingForAgent, pendingCards } from '../domain/selectors'
import { executeCommand } from './commands'
import { parseCommand } from './commandParser'

const NOW = 1_700_000_000_000
const LATER = NOW + 5_000

const base = (): AppState => seedState(NOW)

/** Run a raw command exactly like P3 will: parse -> execute -> dispatch all actions. */
function run(raw: string, state: AppState) {
  const outcome = executeCommand(parseCommand(raw), state, LATER)
  const next = outcome.actions.reduce(reducer, state)
  return { outcome, next }
}

describe('executeCommand: approve_bulk_low_risk', () => {
  it('approves every pending low-risk card and reports the count', () => {
    const state = base()
    const lowRiskCount = pendingCards(state).filter((c) => c.risk === 'low').length
    const { outcome, next } = run('Approve all low-risk actions', state)

    expect(outcome.message).toBe(`Approved ${lowRiskCount} low-risk actions`)
    expect(outcome.showHelp).toBeUndefined()
    expect(pendingCards(next).filter((c) => c.risk === 'low')).toHaveLength(0)
    expect(pendingCards(next)).toHaveLength(20 - lowRiskCount)
  })

  it('reports helpfully with zero actions when no low-risk cards are pending', () => {
    const { next } = run('Approve all low-risk actions', base())
    const { outcome } = run('Approve all low-risk actions', next)
    expect(outcome.actions).toHaveLength(0)
    expect(outcome.message).toMatch(/no low-risk/i)
  })
})

describe('executeCommand: reject_match', () => {
  it('rejects Marketing cards matching "campaign" and confirms', () => {
    const state = base()
    const matches = pendingCards(state).filter(
      (c) => c.agentId === 'marketing' && `${c.title} ${c.summary}`.toLowerCase().includes('campaign'),
    )
    expect(matches.length).toBeGreaterThanOrEqual(2)

    const { outcome, next } = run('Reject marketing campaign', state)
    expect(outcome.message).toMatch(/rejected/i)
    expect(next.cards.filter((c) => c.status === 'rejected')).toHaveLength(matches.length)
    expect(pendingCards(next)).toHaveLength(20 - matches.length)
  })

  it('uses a singular confirmation with the card title for a single match', () => {
    const { outcome, next } = run('reject newsletter', base())
    expect(outcome.message).toMatch(/^Rejected: /)
    expect(next.cards.filter((c) => c.status === 'rejected')).toHaveLength(1)
  })

  it('produces a helpful message and zero actions when nothing matches', () => {
    const state = base()
    const { outcome, next } = run('reject zeppelin', state)
    expect(outcome.actions).toHaveLength(0)
    expect(outcome.message).toMatch(/nothing rejected/i)
    expect(next).toBe(state)
  })
})

describe('executeCommand: explain_agent', () => {
  it('opens the reasoning sheet for the most recent pending Backend card', () => {
    const state = base()
    const expected = latestPendingForAgent(state, 'backend')!
    const { outcome, next } = run('Ask Backend why this changed', state)

    expect(outcome.openReasoningForCardId).toBe(expected.id)
    expect(outcome.message).toContain(expected.title)
    expect(outcome.actions).toHaveLength(0)
    expect(next).toBe(state) // non-destructive: nothing decided
  })

  it('reports when the agent has no pending cards', () => {
    // clear all backend cards first
    const cleared = reducer(base(), { type: 'REJECT_MATCH', agentId: 'backend', keyword: '', now: LATER })
    const { outcome } = run('Ask Backend why this changed', cleared)
    expect(outcome.openReasoningForCardId).toBeUndefined()
    expect(outcome.actions).toHaveLength(0)
    expect(outcome.message).toMatch(/no pending requests from backend/i)
  })
})

describe('executeCommand: delay_tomorrow', () => {
  it('delays the top (oldest) pending card into the delayed state', () => {
    const state = base()
    const top = pendingCards(state)[0]
    const { outcome, next } = run('Delay until tomorrow', state)

    expect(outcome.message).toBe(`Delayed until tomorrow: ${top.title}`)
    const delayed = next.cards.find((c) => c.id === top.id)!
    expect(delayed.status).toBe('delayed')
    expect(delayed.resolution).toEqual({ decidedAt: LATER, target: 'tomorrow' })
    expect(pendingCards(next)).toHaveLength(19)
  })
})

describe('executeCommand: assign_agent', () => {
  it('delegates the top pending card to QA', () => {
    const state = base()
    const top = pendingCards(state)[0]
    const { outcome, next } = run('Assign to QA', state)

    expect(outcome.message).toBe(`Delegated to QA: ${top.title}`)
    const delegated = next.cards.find((c) => c.id === top.id)!
    expect(delegated.status).toBe('delegated')
    expect(delegated.resolution).toEqual({ decidedAt: LATER, target: 'qa' })
    expect(pendingCards(next)).toHaveLength(19)
  })

  it('handles an empty inbox with zero actions', () => {
    const empty: AppState = { ...base(), cards: [] }
    const delay = run('Delay until tomorrow', empty).outcome
    const assign = run('Assign to QA', empty).outcome
    expect(delay.actions).toHaveLength(0)
    expect(assign.actions).toHaveLength(0)
    expect(delay.message).toMatch(/nothing to delay/i)
    expect(assign.message).toMatch(/nothing to assign/i)
  })
})

describe('executeCommand: unknown', () => {
  it('asks for help without touching state', () => {
    const state = base()
    const { outcome, next } = run('frobnicate everything', state)
    expect(outcome.showHelp).toBe(true)
    expect(outcome.actions).toHaveLength(0)
    expect(outcome.message).toMatch(/didn't understand/i)
    expect(next).toBe(state)
  })
})
