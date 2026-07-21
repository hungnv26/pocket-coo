import { describe, expect, it } from 'vitest'
import type { AppState } from '../domain/types'
import { AGENT_IDS, MAX_PENDING, RESUME_COMPLETED_MS, RESUME_IN_PROGRESS_MS, SPAWN_INTERVAL_MS } from '../domain/types'
import { reducer } from '../domain/reducer'
import { seedState } from '../domain/seed'
import { pendingCards } from '../domain/selectors'
import { nextSpawnDelayMs, resumeScript, spawnCard } from './agentEngine'

const NOW = 1_700_000_000_000

describe('nextSpawnDelayMs', () => {
  it('spans the [20s, 40s] window via the injected random source', () => {
    const [min, max] = SPAWN_INTERVAL_MS
    expect(nextSpawnDelayMs(() => 0)).toBe(min)
    expect(nextSpawnDelayMs(() => 0.5)).toBe(min + (max - min) / 2)
    expect(nextSpawnDelayMs(() => 0.999999)).toBeLessThan(max)
  })

  it('always stays inside the window with the default random source', () => {
    for (let i = 0; i < 50; i += 1) {
      const delay = nextSpawnDelayMs()
      expect(delay).toBeGreaterThanOrEqual(SPAWN_INTERVAL_MS[0])
      expect(delay).toBeLessThan(SPAWN_INTERVAL_MS[1])
    }
  })
})

describe('spawnCard', () => {
  it('produces a complete pending card with a card-gen id', () => {
    const card = spawnCard(seedState(NOW), NOW + 1_000)!
    expect(card).not.toBeNull()
    expect(card.id).toMatch(/^card-gen-\d+-\d+$/)
    expect(card.status).toBe('pending')
    expect(card.createdAt).toBe(NOW + 1_000)
    expect(AGENT_IDS).toContain(card.agentId)
    expect(card.title.trim()).not.toBe('')
    expect(card.summary.trim()).not.toBe('')
    expect(card.reasoning.trim()).not.toBe('')
    expect(card.details.trim()).not.toBe('')
    expect(['low', 'medium', 'high']).toContain(card.risk)
  })

  it('rotates through all five agents and keeps ids unique (even at the same timestamp)', () => {
    let state = seedState(NOW)
    const seen: string[] = []
    const ids = new Set<string>()
    for (let i = 0; i < AGENT_IDS.length; i += 1) {
      const card = spawnCard(state, NOW + 1_000)! // same `now` every time
      seen.push(card.agentId)
      ids.add(card.id)
      state = reducer(state, { type: 'CARD_ARRIVED', card })
    }
    expect(new Set(seen).size).toBe(AGENT_IDS.length) // every agent got a turn
    expect(ids.size).toBe(AGENT_IDS.length) // no id collisions
  })

  it('varies content within an agent across rotations (template pool)', () => {
    let state = seedState(NOW)
    const backendTitles = new Set<string>()
    for (let i = 0; i < AGENT_IDS.length * 2; i += 1) {
      const card = spawnCard(state, NOW + 1_000 + i)!
      if (card.agentId === 'backend') backendTitles.add(card.title)
      state = reducer(state, { type: 'CARD_ARRIVED', card })
    }
    expect(backendTitles.size).toBeGreaterThan(1)
  })

  it(`returns null at the pending cap (${MAX_PENDING})`, () => {
    let state = seedState(NOW)
    let spawned = 0
    while (pendingCards(state).length < MAX_PENDING) {
      const card = spawnCard(state, NOW + 1_000 + spawned)
      expect(card).not.toBeNull()
      state = reducer(state, { type: 'CARD_ARRIVED', card: card! })
      spawned += 1
    }
    expect(pendingCards(state)).toHaveLength(MAX_PENDING)
    expect(spawnCard(state, NOW + 99_000)).toBeNull()
  })

  it('counts only pending cards against the cap', () => {
    let state = seedState(NOW)
    while (pendingCards(state).length < MAX_PENDING) {
      state = reducer(state, { type: 'CARD_ARRIVED', card: spawnCard(state, NOW + pendingCards(state).length)! })
    }
    // decide one -> a slot opens
    const top = pendingCards(state)[0]
    state = reducer(state, { type: 'DECIDE', cardId: top.id, decision: { kind: 'approve' }, now: NOW + 200_000 })
    expect(spawnCard(state, NOW + 201_000)).not.toBeNull()
  })
})

describe('resumeScript', () => {
  const ordered = (steps: Array<{ afterMs: number }>) => {
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i].afterMs).toBeGreaterThan(steps[i - 1].afterMs)
    }
  }

  it('approve: in-progress at ~1.5s then completed at ~4.5s', () => {
    const steps = resumeScript('backend', { kind: 'approve' }, NOW)
    expect(steps).toHaveLength(2)
    ordered(steps)
    expect(steps[0].afterMs).toBe(RESUME_IN_PROGRESS_MS)
    expect(steps[0].status.state).toBe('working')
    expect(steps[1].afterMs).toBe(RESUME_COMPLETED_MS)
    expect(steps[1].status.state).toBe('idle')
    expect(steps[1].status.message).toMatch(/complet/i)
    // updatedAt reflects when the status will apply
    expect(steps[0].status.updatedAt).toBe(NOW + RESUME_IN_PROGRESS_MS)
    expect(steps[1].status.updatedAt).toBe(NOW + RESUME_COMPLETED_MS)
  })

  it('reject: revising then stood down', () => {
    const steps = resumeScript('marketing', { kind: 'reject' }, NOW)
    expect(steps).toHaveLength(2)
    ordered(steps)
    expect(steps[0].status.message).toMatch(/revis/i)
    expect(steps[1].status.message).toMatch(/stood down|revised/i)
  })

  it('delegate to an agent: handoff mentions the target', () => {
    const steps = resumeScript('finance', { kind: 'delegate', target: 'qa' }, NOW)
    expect(steps.length).toBeGreaterThan(0)
    ordered(steps)
    for (const s of steps) expect(s.status.message).toContain('QA')
  })

  it("delay ('tomorrow'): stands down until tomorrow", () => {
    const steps = resumeScript('security', { kind: 'delegate', target: 'tomorrow' }, NOW)
    expect(steps.length).toBeGreaterThan(0)
    ordered(steps)
    expect(steps.at(-1)!.status.message).toMatch(/tomorrow/i)
    expect(steps.at(-1)!.status.state).toBe('idle')
  })

  it('every script step is non-empty and within the ~5s resume window', () => {
    const decisions = [
      { kind: 'approve' },
      { kind: 'reject' },
      { kind: 'delegate', target: 'backend' },
      { kind: 'delegate', target: 'tomorrow' },
    ] as const
    for (const decision of decisions) {
      const steps = resumeScript('qa', decision, NOW)
      expect(steps.length).toBeGreaterThan(0)
      for (const s of steps) {
        expect(s.afterMs).toBeGreaterThan(0)
        expect(s.afterMs).toBeLessThanOrEqual(5_000)
        expect(s.status.message.trim()).not.toBe('')
      }
    }
  })
})

describe('full loop: spawn -> arrive -> decide -> resume (pure)', () => {
  it('closes the request -> decision -> resume loop without timers', () => {
    let state: AppState = seedState(NOW)
    const card = spawnCard(state, NOW + 30_000)!
    state = reducer(state, { type: 'CARD_ARRIVED', card })
    expect(pendingCards(state)).toHaveLength(21)

    state = reducer(state, { type: 'DECIDE', cardId: card.id, decision: { kind: 'approve' }, now: NOW + 35_000 })
    expect(pendingCards(state)).toHaveLength(20)

    for (const step of resumeScript(card.agentId, { kind: 'approve' }, NOW + 35_000)) {
      state = reducer(state, { type: 'AGENT_STATUS', agentId: card.agentId, status: step.status })
    }
    expect(state.agents[card.agentId].status.state).toBe('idle')
    expect(state.agents[card.agentId].status.message).toMatch(/complet/i)
  })
})
