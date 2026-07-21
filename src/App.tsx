/**
 * App shell. Owned by: P3 (integration).
 *
 * Wires the store (useReducer + persistence + scheduler) to P2's surfaces:
 * - useReducer over the domain reducer, seeded from localStorage or the seed fixture
 * - surface navigation (Home <-> Inbox), sheet state, toast queue (3 s expiry)
 * - command flow: parseCommand -> executeCommand -> dispatch/toast/sheet/help
 * - agent loop: spawn timer (20-40 s, cap 30) + resume scripts after decisions
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { AgentId, AppState, ApprovalCard, Decision, DelegateTarget } from './domain/types'
import { AGENT_IDS, AGENT_NAMES } from './domain/types'
import { cardMatches, reducer } from './domain/reducer'
import { seedState } from './domain/seed'
import { pendingCards, queueCounts } from './domain/selectors'
import { parseCommand } from './application/commandParser'
import { executeCommand } from './application/commands'
import { nextSpawnDelayMs, resumeScript, spawnCard } from './application/agentEngine'
import { clearState, loadState, saveState } from './infrastructure/persistence'
import { createScheduler } from './infrastructure/scheduler'
import type { Scheduler } from './infrastructure/scheduler'
import type { SheetRequest, Surface, ToastItem } from './presentation/contracts'
import { HomeSurface } from './presentation/HomeSurface'
import { InboxSurface } from './presentation/InboxSurface'
import { BottomSheetHost } from './presentation/BottomSheetHost'
import { ToastHost } from './presentation/ToastHost'

const TOAST_DURATION_MS = 3_000

function initState(): AppState {
  return loadState() ?? seedState(Date.now())
}

function toastForDecision(card: ApprovalCard, decision: Decision): string {
  switch (decision.kind) {
    case 'approve':
      return `Approved: ${card.title}`
    case 'reject':
      return `Rejected: ${card.title}`
    case 'delegate':
      return decision.target === 'tomorrow'
        ? `Delayed until tomorrow: ${card.title}`
        : `Delegated to ${AGENT_NAMES[decision.target]}`
  }
}

type CommandFeedback = { message: string; showHelp: boolean } | null

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const [surface, setSurface] = useState<Surface>('home')
  const [sheet, setSheet] = useState<SheetRequest | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [commandFeedback, setCommandFeedback] = useState<CommandFeedback>(null)

  // Latest state for async callbacks (timers, gesture callbacks that arrive late).
  const stateRef = useRef(state)
  stateRef.current = state

  const schedulerRef = useRef<Scheduler | null>(null)
  const restartSpawnLoopRef = useRef<() => void>(() => {})
  const toastSeq = useRef(0)

  // ---------------------------------------------------------------------------
  // Persistence: snapshot every state change (D11).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    saveState(state)
  }, [state])

  // ---------------------------------------------------------------------------
  // Toast queue with 3-second auto-expiry.
  // ---------------------------------------------------------------------------
  const pushToast = useCallback((message: string) => {
    toastSeq.current += 1
    const id = `toast-${Date.now()}-${toastSeq.current}`
    setToasts((prev) => [...prev, { id, message }])
    schedulerRef.current?.schedule(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  // ---------------------------------------------------------------------------
  // Agent resume scripts (Flow E): timed AGENT_STATUS dispatches after decisions.
  // ---------------------------------------------------------------------------
  const scheduleResume = useCallback((agentId: AgentId, decision: Decision) => {
    for (const step of resumeScript(agentId, decision, Date.now())) {
      schedulerRef.current?.schedule(() => {
        dispatch({ type: 'AGENT_STATUS', agentId, status: step.status })
      }, step.afterMs)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Decisions (buttons, gestures, in-sheet buttons, delegate picker).
  // Guarded against late gesture callbacks racing bulk commands: only pending
  // cards are acted on, so a stale callback is a silent no-op.
  // ---------------------------------------------------------------------------
  const decide = useCallback(
    (cardId: string, decision: Decision) => {
      const card = stateRef.current.cards.find((c) => c.id === cardId)
      if (card === undefined || card.status !== 'pending') return
      dispatch({ type: 'DECIDE', cardId, decision, now: Date.now() })
      setSheet(null)
      scheduleResume(card.agentId, decision)
      pushToast(toastForDecision(card, decision))
    },
    [pushToast, scheduleResume],
  )

  const onApprove = useCallback((cardId: string) => decide(cardId, { kind: 'approve' }), [decide])
  const onReject = useCallback((cardId: string) => decide(cardId, { kind: 'reject' }), [decide])
  const onDelegate = useCallback(
    (cardId: string, target: DelegateTarget) => decide(cardId, { kind: 'delegate', target }),
    [decide],
  )

  // ---------------------------------------------------------------------------
  // Command flow: parse -> execute -> dispatch actions, toast, sheet, help.
  // ---------------------------------------------------------------------------
  const onSubmitCommand = useCallback(
    (raw: string) => {
      const current = stateRef.current
      const outcome = executeCommand(parseCommand(raw), current, Date.now())

      // Schedule resume scripts for every agent whose card(s) the command decides,
      // computed against pre-dispatch state so counts/agents can't disagree.
      for (const action of outcome.actions) {
        if (action.type === 'DECIDE') {
          const card = current.cards.find((c) => c.id === action.cardId)
          if (card !== undefined && card.status === 'pending') {
            scheduleResume(card.agentId, action.decision)
          }
        } else if (action.type === 'BULK_APPROVE_LOW_RISK') {
          const agents = new Set<AgentId>(
            current.cards.filter((c) => c.status === 'pending' && c.risk === 'low').map((c) => c.agentId),
          )
          for (const agentId of agents) scheduleResume(agentId, { kind: 'approve' })
        } else if (action.type === 'REJECT_MATCH') {
          const agents = new Set<AgentId>(
            current.cards
              .filter((c) => c.status === 'pending' && cardMatches(c, action.agentId, action.keyword))
              .map((c) => c.agentId),
          )
          for (const agentId of agents) scheduleResume(agentId, { kind: 'reject' })
        }
      }

      for (const action of outcome.actions) dispatch(action)
      setCommandFeedback({ message: outcome.message, showHelp: outcome.showHelp ?? false })
      pushToast(outcome.message)
      if (outcome.openReasoningForCardId !== undefined) {
        setSheet({ kind: 'reasoning', cardId: outcome.openReasoningForCardId })
      }
    },
    [pushToast, scheduleResume],
  )

  // ---------------------------------------------------------------------------
  // Engine loop: spawn a new card every 20-40 s (cap handled by spawnCard +
  // reducer). StrictMode-safe: the scheduler is created per mount and fully
  // cancelled on cleanup; duplicate CARD_ARRIVED ids are dropped by the reducer.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const scheduler = createScheduler()
    schedulerRef.current = scheduler

    const scheduleNextSpawn = () => {
      scheduler.schedule(() => {
        const now = Date.now()
        const card = spawnCard(stateRef.current, now)
        if (card !== null) {
          dispatch({ type: 'CARD_ARRIVED', card })
          pushToast(`New request from ${AGENT_NAMES[card.agentId]}`)
        }
        scheduleNextSpawn()
      }, nextSpawnDelayMs())
    }
    scheduleNextSpawn()
    restartSpawnLoopRef.current = scheduleNextSpawn

    return () => {
      scheduler.cancelAll()
      schedulerRef.current = null
      restartSpawnLoopRef.current = () => {}
    }
  }, [pushToast])

  // ---------------------------------------------------------------------------
  // Reset demo (Flow F): clear storage, restore seed, cancel timers, restart loop.
  // ---------------------------------------------------------------------------
  const onResetDemo = useCallback(() => {
    schedulerRef.current?.cancelAll()
    clearState()
    dispatch({ type: 'RESET', state: seedState(Date.now()) })
    setSheet(null)
    setToasts([])
    setCommandFeedback(null)
    restartSpawnLoopRef.current()
    pushToast('Demo reset — 20 approvals waiting')
  }, [pushToast])

  // ---------------------------------------------------------------------------
  // Derived render data.
  // ---------------------------------------------------------------------------
  const pending = pendingCards(state)
  const counts = queueCounts(state)
  const agents = AGENT_IDS.map((id) => state.agents[id])

  // Sheet card must be pending; if it got resolved (e.g. by a bulk command
  // while the sheet was open), drop the sheet state entirely.
  const sheetCard =
    sheet !== null ? (state.cards.find((c) => c.id === sheet.cardId && c.status === 'pending') ?? null) : null
  useEffect(() => {
    if (sheet !== null && sheetCard === null) setSheet(null)
  }, [sheet, sheetCard])

  return (
    <div className="phone-frame">
      {surface === 'home' ? (
        <HomeSurface
          counts={counts}
          agents={agents}
          onOpenInbox={() => setSurface('inbox')}
          onResetDemo={onResetDemo}
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
          commandFeedback={commandFeedback}
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

export default App
