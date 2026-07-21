/**
 * Presentation contracts: the props P2's components accept and P3 wires up.
 * P2 owns this file after scaffold, but renaming/removing an existing prop
 * requires agreement with P3 (integration builds against these).
 *
 * All presentation components are props-driven (no store imports) so P2 can
 * build against fixture data before integration.
 */
import type {
  Agent,
  ApprovalCard,
  DelegateTarget,
  QueueCounts,
} from '../domain/types'

export type Surface = 'home' | 'inbox'
export type SheetKind = 'reasoning' | 'details' | 'delegate'

export interface SheetRequest {
  kind: SheetKind
  cardId: string
}

export interface ToastItem {
  id: string
  message: string
}

/** Callbacks the UI raises; P3 maps them to store dispatches. */
export interface DecisionHandlers {
  onApprove(cardId: string): void
  onReject(cardId: string): void
  onDelegate(cardId: string, target: DelegateTarget): void
}

export interface HomeSurfaceProps {
  counts: QueueCounts
  agents: Agent[]
  onOpenInbox(): void
  onResetDemo(): void
}

export interface InboxSurfaceProps extends DecisionHandlers {
  cards: ApprovalCard[] // pending only, top card first
  onOpenSheet(req: SheetRequest): void
  onBack(): void
  onSubmitCommand(raw: string): void
  commandFeedback: { message: string; showHelp: boolean } | null
}

export interface CardViewProps extends DecisionHandlers {
  card: ApprovalCard
  onOpenSheet(req: SheetRequest): void
}

export interface BottomSheetHostProps extends DecisionHandlers {
  request: SheetRequest | null
  card: ApprovalCard | null // resolved card for request.cardId
  onClose(): void
}

export interface ToastHostProps {
  toasts: ToastItem[]
}

/**
 * Added by P2 (additive): props for the command bar rendered inside
 * InboxSurface. `feedback` mirrors InboxSurfaceProps.commandFeedback.
 */
export interface CommandBarProps {
  onSubmitCommand(raw: string): void
  feedback: { message: string; showHelp: boolean } | null
}
