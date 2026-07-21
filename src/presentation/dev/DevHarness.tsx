/**
 * DevHarness — standalone playground for P2 components with fixture data.
 * Owned by: P2. NOT part of the shipped app: P3 never imports this; to use it
 * locally, temporarily point main.tsx at DevHarness (do not commit that).
 *
 * It fakes just enough store behavior (decide/remove, sheets, toasts,
 * command echo) to exercise every gesture, button, and sheet.
 */
import { useCallback, useRef, useState } from 'react'
import type { ApprovalCard, DelegateTarget } from '../../domain/types'
import { AGENT_NAMES } from '../../domain/types'
import type { SheetRequest, Surface, ToastItem } from '../contracts'
import { fixtureAgents, fixtureCards, fixtureCounts } from '../fixtures'
import { HomeSurface } from '../HomeSurface'
import { InboxSurface } from '../InboxSurface'
import { BottomSheetHost } from '../BottomSheetHost'
import { ToastHost } from '../ToastHost'

export function DevHarness() {
  const [surface, setSurface] = useState<Surface>('home')
  const [cards, setCards] = useState<ApprovalCard[]>(fixtureCards)
  const [sheet, setSheet] = useState<SheetRequest | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [feedback, setFeedback] = useState<{ message: string; showHelp: boolean } | null>(null)
  const toastSeq = useRef(0)

  const pushToast = useCallback((message: string) => {
    toastSeq.current += 1
    const id = `toast-${toastSeq.current}`
    setToasts((t) => [...t, { id, message }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])

  const titleOf = useCallback(
    (cardId: string) => cards.find((c) => c.id === cardId)?.title ?? cardId,
    [cards],
  )

  const remove = useCallback((cardId: string) => {
    setCards((cs) => cs.filter((c) => c.id !== cardId))
    setSheet(null)
  }, [])

  const onApprove = useCallback(
    (cardId: string) => {
      pushToast(`Approved: ${titleOf(cardId)}`)
      remove(cardId)
    },
    [pushToast, remove, titleOf],
  )

  const onReject = useCallback(
    (cardId: string) => {
      pushToast(`Rejected: ${titleOf(cardId)}`)
      remove(cardId)
    },
    [pushToast, remove, titleOf],
  )

  const onDelegate = useCallback(
    (cardId: string, target: DelegateTarget) => {
      pushToast(
        target === 'tomorrow' ? 'Delayed until tomorrow' : `Delegated to ${AGENT_NAMES[target]}`,
      )
      remove(cardId)
    },
    [pushToast, remove],
  )

  const onSubmitCommand = useCallback(
    (raw: string) => {
      if (/approve|reject|delay|assign|ask/i.test(raw)) {
        setFeedback({ message: `(harness) would execute: "${raw}"`, showHelp: false })
      } else {
        setFeedback({ message: `Didn't understand "${raw}". Try one of these:`, showHelp: true })
      }
    },
    [],
  )

  const pending = cards.filter((c) => c.status === 'pending')
  const sheetCard = sheet ? (cards.find((c) => c.id === sheet.cardId) ?? null) : null

  return (
    <div className="phone-frame">
      {surface === 'home' ? (
        <HomeSurface
          counts={fixtureCounts(cards)}
          agents={fixtureAgents}
          onOpenInbox={() => setSurface('inbox')}
          onResetDemo={() => {
            setCards(fixtureCards)
            setSheet(null)
            setFeedback(null)
            pushToast('Demo reset')
          }}
        />
      ) : (
        <InboxSurface
          cards={pending}
          onApprove={onApprove}
          onReject={onReject}
          onDelegate={onDelegate}
          onOpenSheet={setSheet}
          onBack={() => setSurface('home')}
          onSubmitCommand={onSubmitCommand}
          commandFeedback={feedback}
        />
      )}
      <BottomSheetHost
        request={sheet}
        card={sheetCard}
        onApprove={onApprove}
        onReject={onReject}
        onDelegate={onDelegate}
        onClose={() => setSheet(null)}
      />
      <ToastHost toasts={toasts} />
    </div>
  )
}
