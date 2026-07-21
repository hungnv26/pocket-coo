/**
 * Rule-based command parser (D12): raw text -> Command. Pure TS, no React.
 * Case-insensitive keyword/pattern matching; never throws.
 *
 * Owned by: P1 (core logic). Stub only in scaffold.
 */
import type { Command } from '../domain/types'

export function parseCommand(raw: string): Command {
  // TODO(P1): recognize (case-insensitively, tolerant of small wording drift):
  //  1. "approve all low-risk actions"        -> approve_bulk_low_risk
  //  2. "reject marketing campaign"           -> reject_match { agentId: 'marketing', keyword: 'campaign' }
  //  3. "ask backend why this changed"        -> explain_agent { agentId: 'backend' } (any agent name works)
  //  4. "delay until tomorrow"                -> delay_tomorrow
  //  5. "assign to qa"                        -> assign_agent { target: 'qa' } (any agent name works)
  //  anything else                            -> unknown { raw }
  return { intent: 'unknown', raw }
}
