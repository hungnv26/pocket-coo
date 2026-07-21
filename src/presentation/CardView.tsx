/**
 * CardView — one approval-request card. Owned by: P2 (presentation).
 *
 * Shows all seven fields (title, summary, confidence %, impact, urgency,
 * requesting agent, recommended action) plus a risk badge, and the five
 * labeled button fallbacks: Approve, Reject, Delegate, Why?, Details.
 *
 * Gestures come from useCardGestures; the actions row stops pointerdown
 * propagation so buttons never start a drag/long-press.
 */
import { AGENT_NAMES } from '../domain/types'
import type { CardViewProps } from './contracts'
import { useCardGestures } from './useCardGestures'

const HINT_LABELS = { approve: 'Approve', reject: 'Reject', delegate: 'Delegate' } as const

export function CardView(props: CardViewProps) {
  const { card, onOpenSheet } = props
  const { handlers, style, hint, exiting } = useCardGestures({
    onSwipeRight: () => props.onApprove(card.id),
    onSwipeLeft: () => props.onReject(card.id),
    onSwipeUp: () => onOpenSheet({ kind: 'delegate', cardId: card.id }),
    onLongPress: () => onOpenSheet({ kind: 'reasoning', cardId: card.id }),
    onDoubleTap: () => onOpenSheet({ kind: 'details', cardId: card.id }),
  })

  return (
    <article
      className={`card${exiting ? ' card-exiting' : ''}`}
      style={style}
      {...handlers}
      aria-label={`Approval request from ${AGENT_NAMES[card.agentId]}: ${card.title}`}
    >
      <header className="card-top">
        <span className="agent-chip">{AGENT_NAMES[card.agentId]}</span>
        <span className={`badge badge-risk-${card.risk}`}>{card.risk} risk</span>
      </header>

      <h2 className="card-title">{card.title}</h2>
      <p className="card-summary">{card.summary}</p>

      <dl className="card-meta">
        <div className="meta-item">
          <dt>Confidence</dt>
          <dd>{card.confidence}%</dd>
        </div>
        <div className="meta-item">
          <dt>Impact</dt>
          <dd>{card.impact}</dd>
        </div>
        <div className="meta-item">
          <dt>Urgency</dt>
          <dd className={`urgency urgency-${card.urgency}`}>{card.urgency}</dd>
        </div>
      </dl>

      <p className="card-recommend">
        Recommended: <strong>{card.recommendedAction}</strong>
      </p>

      <div className="card-actions" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-approve" onClick={() => props.onApprove(card.id)}>
          Approve
        </button>
        <button type="button" className="btn btn-reject" onClick={() => props.onReject(card.id)}>
          Reject
        </button>
        <button
          type="button"
          className="btn btn-neutral"
          onClick={() => onOpenSheet({ kind: 'delegate', cardId: card.id })}
        >
          Delegate
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onOpenSheet({ kind: 'reasoning', cardId: card.id })}
        >
          Why?
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onOpenSheet({ kind: 'details', cardId: card.id })}
        >
          Details
        </button>
      </div>

      {hint && (
        <div className={`swipe-hint swipe-hint-${hint}`} aria-hidden="true">
          {HINT_LABELS[hint]}
        </div>
      )}
    </article>
  )
}
