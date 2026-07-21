/**
 * Scaffold smoke test — proves vitest wiring works.
 * P1 replaces/extends with real reducer, parser, engine, and seed tests.
 */
import { describe, expect, it } from 'vitest'
import { AGENT_IDS, COMMAND_EXAMPLES, MAX_PENDING, SEED_CARD_COUNT } from './types'

describe('domain constants', () => {
  it('has five agents', () => {
    expect(AGENT_IDS).toHaveLength(5)
  })

  it('has five command examples', () => {
    expect(COMMAND_EXAMPLES).toHaveLength(5)
  })

  it('seeds 20 cards with a pending cap of 30 (D8)', () => {
    expect(SEED_CARD_COUNT).toBe(20)
    expect(MAX_PENDING).toBe(30)
  })
})
