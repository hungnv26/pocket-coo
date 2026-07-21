/**
 * InboxSurface — the triage surface. Owned by: P2 (presentation).
 *
 * Vertical stack of pending cards (top card first), back-to-Home affordance,
 * and the persistent command bar pinned to the bottom half (one-handed reach).
 * Bottom sheets and toasts are mounted by P3 as siblings (BottomSheetHost /
 * ToastHost), not here.
 */
import type { InboxSurfaceProps } from './contracts'
import { CardView } from './CardView'
import { CommandBar } from './CommandBar'

export function InboxSurface(props: InboxSurfaceProps) {
  const { cards } = props

  return (
    <div className="surface inbox">
      <header className="inbox-header">
        <button type="button" className="btn btn-ghost btn-back" onClick={props.onBack}>
          &#8249; Home
        </button>
        <h1 className="inbox-title">Inbox</h1>
        <span className="pending-pill" aria-label={`${cards.length} pending`}>
          {cards.length}
        </span>
      </header>

      <div className="card-list">
        {cards.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">All clear</p>
            <p className="empty-hint">No decisions waiting. New requests from your agents will appear here.</p>
          </div>
        ) : (
          cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              onApprove={props.onApprove}
              onReject={props.onReject}
              onDelegate={props.onDelegate}
              onOpenSheet={props.onOpenSheet}
            />
          ))
        )}
      </div>

      <CommandBar onSubmitCommand={props.onSubmitCommand} feedback={props.commandFeedback} />
    </div>
  )
}
