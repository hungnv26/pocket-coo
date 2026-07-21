/**
 * BottomSheetHost — renders the one open bottom sheet (reasoning / details /
 * delegate) over the Inbox. Owned by: P2 (presentation).
 *
 * - Slide-up entrance animation (CSS), backdrop tap + Close button + swipe-down
 *   (pointer drag ≥ 80px on the sheet grip/header) all dismiss without deciding.
 * - Reasoning and details sheets include Approve / Reject so the owner can
 *   decide without leaving the sheet (P3 closes the sheet on decision).
 * - Delegate sheet lists the five agents plus "Tomorrow (delay)".
 */
import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { AGENT_IDS, AGENT_NAMES } from '../domain/types'
import type { DelegateTarget } from '../domain/types'
import type { BottomSheetHostProps } from './contracts'

const SHEET_TITLES = {
  reasoning: 'Why this request?',
  details: 'Details',
  delegate: 'Delegate to…',
} as const

const DISMISS_THRESHOLD = 80

export function BottomSheetHost(props: BottomSheetHostProps) {
  const { request, card } = props
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<{ y: number; pointerId: number } | null>(null)

  if (!request || !card) return null

  function onGripPointerDown(e: ReactPointerEvent<HTMLElement>) {
    // Never start the swipe-down drag (or capture the pointer) from a button:
    // pointer capture retargets the pointerup, so the click would fire on
    // .sheet-grip-area instead of the Close button, leaving it dead.
    if ((e.target as HTMLElement).closest('button')) return
    dragStart.current = { y: e.clientY, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onGripPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (dragStart.current?.pointerId !== e.pointerId) return
    setDragY(Math.max(0, e.clientY - dragStart.current.y))
  }

  function onGripPointerUp(e: ReactPointerEvent<HTMLElement>) {
    if (dragStart.current?.pointerId !== e.pointerId) return
    const dy = e.clientY - dragStart.current.y
    dragStart.current = null
    setDragY(0)
    if (dy >= DISMISS_THRESHOLD) props.onClose()
  }

  function onGripPointerCancel() {
    dragStart.current = null
    setDragY(0)
  }

  const sheetStyle: CSSProperties =
    dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : {}

  const delegateTargets: { target: DelegateTarget; label: string }[] = [
    ...AGENT_IDS.map((id) => ({ target: id as DelegateTarget, label: AGENT_NAMES[id] })),
    { target: 'tomorrow', label: 'Tomorrow (delay)' },
  ]

  return (
    <div className="sheet-layer">
      <div className="sheet-backdrop" onClick={props.onClose} aria-hidden="true" />
      <section
        className="sheet"
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-label={SHEET_TITLES[request.kind]}
      >
        <div
          className="sheet-grip-area"
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={onGripPointerCancel}
        >
          <div className="sheet-grip" aria-hidden="true" />
          <header className="sheet-header">
            <h2 className="sheet-title">{SHEET_TITLES[request.kind]}</h2>
            <button type="button" className="btn btn-ghost sheet-close" onClick={props.onClose}>
              Close
            </button>
          </header>
        </div>

        <div className="sheet-body">
          <p className="sheet-card-ref">
            <span className="agent-chip">{AGENT_NAMES[card.agentId]}</span> {card.title}
          </p>

          {request.kind === 'reasoning' && <p className="sheet-text">{card.reasoning}</p>}

          {request.kind === 'details' && (
            <>
              <p className="sheet-text">{card.details}</p>
              <dl className="sheet-facts">
                <div className="fact">
                  <dt>Risk</dt>
                  <dd className={`badge badge-risk-${card.risk}`}>{card.risk}</dd>
                </div>
                <div className="fact">
                  <dt>Urgency</dt>
                  <dd className={`urgency urgency-${card.urgency}`}>{card.urgency}</dd>
                </div>
                <div className="fact">
                  <dt>Confidence</dt>
                  <dd>{card.confidence}%</dd>
                </div>
                <div className="fact">
                  <dt>Impact</dt>
                  <dd>{card.impact}</dd>
                </div>
                <div className="fact">
                  <dt>Requested</dt>
                  <dd>{new Date(card.createdAt).toLocaleString()}</dd>
                </div>
                <div className="fact">
                  <dt>Agent</dt>
                  <dd>{AGENT_NAMES[card.agentId]}</dd>
                </div>
              </dl>
            </>
          )}

          {request.kind === 'delegate' && (
            <ul className="delegate-list">
              {delegateTargets.map(({ target, label }) => (
                <li key={target}>
                  <button
                    type="button"
                    className="btn delegate-option"
                    onClick={() => props.onDelegate(card.id, target)}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {request.kind !== 'delegate' && (
          <footer className="sheet-actions">
            <button type="button" className="btn btn-approve" onClick={() => props.onApprove(card.id)}>
              Approve
            </button>
            <button type="button" className="btn btn-reject" onClick={() => props.onReject(card.id)}>
              Reject
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}
