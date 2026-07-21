/**
 * Command execution use-case: Command + AppState -> effect description.
 * Pure TS (no React, no timers): returns the actions to dispatch and the
 * user-facing outcome so presentation can toast it / open a sheet.
 *
 * Owned by: P1 (core logic). Stub only in scaffold.
 */
import type { AppAction, AppState, Command } from '../domain/types'

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

export function executeCommand(command: Command, _state: AppState, _now: number): CommandOutcome {
  // TODO(P1): map each intent to actions + message using domain selectors.
  return { actions: [], message: '', showHelp: command.intent === 'unknown' }
}
