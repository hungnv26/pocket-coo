/**
 * Command execution use-case: Command + AppState -> effect description.
 * Pure TS (no React, no timers): returns the actions to dispatch and the
 * user-facing outcome so presentation can toast it / open a sheet.
 *
 * Owned by: P1 (core logic).
 */
import type { AppAction, AppState, Command } from '../domain/types'
import { AGENT_NAMES } from '../domain/types'
import { cardMatches } from '../domain/reducer'
import { latestPendingForAgent, pendingCards } from '../domain/selectors'

export interface CommandOutcome {
  /** Actions for the store to dispatch (may be empty). */
  actions: AppAction[]
  /** Toast/confirmation text, e.g. "Approved 4 low-risk actions". */
  message: string
  /** If set, presentation opens the reasoning sheet for this card (command 3). */
  openReasoningForCardId?: string
  /** True when intent === 'unknown' -> presentation shows COMMAND_EXAMPLES help. */
  showHelp?: boolean
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function executeCommand(command: Command, state: AppState, now: number): CommandOutcome {
  switch (command.intent) {
    case 'approve_bulk_low_risk': {
      const count = pendingCards(state).filter((c) => c.risk === 'low').length
      if (count === 0) {
        return { actions: [], message: 'No low-risk actions pending — nothing to approve.' }
      }
      return {
        actions: [{ type: 'BULK_APPROVE_LOW_RISK', now }],
        message: `Approved ${plural(count, 'low-risk action')}`,
      }
    }

    case 'reject_match': {
      const matches = pendingCards(state).filter((c) => cardMatches(c, command.agentId, command.keyword))
      const label =
        command.agentId !== undefined
          ? `${AGENT_NAMES[command.agentId]}${command.keyword !== '' ? ` "${command.keyword}"` : ''}`
          : `"${command.keyword}"`
      if (matches.length === 0) {
        return { actions: [], message: `No pending requests match ${label} — nothing rejected.` }
      }
      return {
        actions: [{ type: 'REJECT_MATCH', ...(command.agentId !== undefined ? { agentId: command.agentId } : {}), keyword: command.keyword, now }],
        message:
          matches.length === 1
            ? `Rejected: ${matches[0].title}`
            : `Rejected ${plural(matches.length, 'request')} matching ${label}`,
      }
    }

    case 'explain_agent': {
      const card = latestPendingForAgent(state, command.agentId)
      const name = AGENT_NAMES[command.agentId]
      if (card === undefined) {
        return { actions: [], message: `No pending requests from ${name} to explain.` }
      }
      return {
        actions: [],
        message: `${name}'s reasoning for "${card.title}"`,
        openReasoningForCardId: card.id,
      }
    }

    case 'delay_tomorrow': {
      const top = pendingCards(state)[0]
      if (top === undefined) {
        return { actions: [], message: 'Inbox is clear — nothing to delay.' }
      }
      return {
        actions: [{ type: 'DECIDE', cardId: top.id, decision: { kind: 'delegate', target: 'tomorrow' }, now }],
        message: `Delayed until tomorrow: ${top.title}`,
      }
    }

    case 'assign_agent': {
      const top = pendingCards(state)[0]
      const name = AGENT_NAMES[command.target]
      if (top === undefined) {
        return { actions: [], message: `Inbox is clear — nothing to assign to ${name}.` }
      }
      return {
        actions: [{ type: 'DECIDE', cardId: top.id, decision: { kind: 'delegate', target: command.target }, now }],
        message: `Delegated to ${name}: ${top.title}`,
      }
    }

    case 'unknown':
      return { actions: [], message: "Didn't understand that command.", showHelp: true }
  }
}
