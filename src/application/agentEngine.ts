/**
 * Mock agent engine — PURE logic only (no setTimeout/setInterval here; the
 * infrastructure scheduler drives it). Decides WHAT happens; infra decides WHEN.
 *
 * Owned by: P1 (core logic). Stub only in scaffold.
 */
import type { AgentStatus, ApprovalCard, AppState, Decision } from '../domain/types'
import { SPAWN_INTERVAL_MS } from '../domain/types'

/** Random delay for the next spawned card, within [20s, 40s] (D8). */
export function nextSpawnDelayMs(random: () => number = Math.random): number {
  const [min, max] = SPAWN_INTERVAL_MS
  return min + Math.floor(random() * (max - min))
}

/**
 * Generate a new pending card, or null if the pending cap (30) is reached.
 * Content comes from a rotating template pool per agent.
 */
export function spawnCard(_state: AppState, _now: number, _random: () => number = Math.random): ApprovalCard | null {
  // TODO(P1)
  return null
}

/**
 * Status-line script an agent follows after a decision (Flow E):
 * approve -> "in progress" then "completed"; reject -> "revising"/"stood down";
 * delegate/delay -> appropriate handoff message. Timed offsets are relative to
 * the decision; infra schedules the AGENT_STATUS dispatches.
 */
export function resumeScript(
  _agentId: string,
  _decision: Decision,
  _now: number,
): Array<{ afterMs: number; status: AgentStatus }> {
  // TODO(P1): use RESUME_IN_PROGRESS_MS / RESUME_COMPLETED_MS from domain/types.
  return []
}
