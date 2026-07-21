/**
 * Rule-based command parser (D12): raw text -> Command. Pure TS, no React.
 * Case-insensitive keyword/pattern matching; never throws.
 *
 * Recognized shapes (tolerant of minor wording drift):
 *  1. "approve all low-risk actions"  -> approve_bulk_low_risk
 *  2. "reject marketing campaign"     -> reject_match { agentId?: 'marketing', keyword: 'campaign' }
 *  3. "ask backend why this changed"  -> explain_agent { agentId: 'backend' }
 *  4. "delay until tomorrow"          -> delay_tomorrow
 *  5. "assign to qa"                  -> assign_agent { target: 'qa' }
 *  anything else                      -> unknown { raw }
 *
 * Owned by: P1 (core logic).
 */
import type { AgentId, Command } from '../domain/types'
import { AGENT_IDS } from '../domain/types'

/** Match a single word against an agent id/name, case-insensitively. */
function asAgentId(word: string | undefined): AgentId | undefined {
  if (word === undefined) return undefined
  const normalized = word.toLowerCase()
  return AGENT_IDS.find((id) => id === normalized)
}

export function parseCommand(raw: string): Command {
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (text === '') return { intent: 'unknown', raw }

  // 1. Bulk approve: "approve" + "low risk"/"low-risk" anywhere.
  if (/\bapprove\b/.test(text) && /\blow[\s-]?risk\b/.test(text)) {
    return { intent: 'approve_bulk_low_risk' }
  }

  // 3. Explain: "ask <agent> [why …]" — agent name required.
  const askMatch = text.match(/\bask\s+(?:the\s+)?([a-z]+)/)
  if (askMatch !== null) {
    const agentId = asAgentId(askMatch[1])
    if (agentId !== undefined) return { intent: 'explain_agent', agentId }
  }

  // 5. Assign/delegate: "assign to qa", "delegate to the qa agent", "assign backend".
  const assignMatch = text.match(/\b(?:assign|delegate|hand(?:\s+it)?(?:\s+off)?)\s+(?:it\s+)?(?:to\s+)?(?:the\s+)?([a-z]+)/)
  if (assignMatch !== null) {
    const target = asAgentId(assignMatch[1])
    if (target !== undefined) return { intent: 'assign_agent', target }
  }

  // 4. Delay: "delay until tomorrow", "delay", "push to tomorrow", "postpone".
  if (/\b(?:delay|postpone|tomorrow)\b/.test(text)) {
    return { intent: 'delay_tomorrow' }
  }

  // 2. Reject: "reject [agent] [keyword…]" — needs at least one word after "reject".
  const rejectMatch = text.match(/\breject\s+(?:the\s+)?(.+)$/)
  if (rejectMatch !== null) {
    const words = rejectMatch[1].split(' ')
    const agentId = asAgentId(words[0])
    const keyword = (agentId !== undefined ? words.slice(1) : words).join(' ').trim()
    // "reject" + nothing matchable (no agent, no keyword) is not a valid command.
    if (agentId !== undefined || keyword !== '') {
      return { intent: 'reject_match', ...(agentId !== undefined ? { agentId } : {}), keyword }
    }
  }

  return { intent: 'unknown', raw }
}
