/**
 * useCardGestures — pointer-event gesture recognition for an approval card.
 * Owned by: P2 (presentation).
 *
 * Gestures (all pointer events, so mouse drags count — SPEC §9.2):
 *   - horizontal drag ≥ 80px right  -> onSwipeRight (approve) with exit animation
 *   - horizontal drag ≥ 80px left   -> onSwipeLeft  (reject)  with exit animation
 *   - vertical drag ≥ 80px up       -> onSwipeUp    (delegate sheet), card snaps back
 *   - hold ≥ 500ms without movement -> onLongPress  (reasoning sheet)
 *   - two taps < 300ms apart        -> onDoubleTap  (details sheet)
 *
 * Guarantees:
 *   - long-press never fires once the pointer moved beyond the slop
 *   - a fired long-press suppresses tap/drag handling on the following pointerup
 *   - taps (for double-tap) only count when the pointer barely moved
 *   - buttons stay independent: stop pointerdown propagation on the actions row
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

export interface CardGestureCallbacks {
  onSwipeRight(): void
  onSwipeLeft(): void
  onSwipeUp(): void
  onLongPress(): void
  onDoubleTap(): void
}

export interface CardGestureHandlers {
  onPointerDown(e: ReactPointerEvent<HTMLElement>): void
  onPointerMove(e: ReactPointerEvent<HTMLElement>): void
  onPointerUp(e: ReactPointerEvent<HTMLElement>): void
  onPointerCancel(e: ReactPointerEvent<HTMLElement>): void
}

/** Which action the current drag would trigger if released now (for UI hints). */
export type GestureHint = 'approve' | 'reject' | 'delegate' | null

export interface CardGestures {
  handlers: CardGestureHandlers
  /** Inline transform/transition for the card element. */
  style: CSSProperties
  /** Past-threshold hint while dragging; null when idle. */
  hint: GestureHint
  /** True while the exit animation (approve/reject) is playing. */
  exiting: boolean
}

const H_THRESHOLD = 80
const V_THRESHOLD = 80
const SLOP = 12
const LONG_PRESS_MS = 500
const DOUBLE_TAP_MS = 300
const EXIT_MS = 220

export function useCardGestures(callbacks: CardGestureCallbacks): CardGestures {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null)
  const [exit, setExit] = useState<'right' | 'left' | null>(null)

  const cb = useRef(callbacks)
  cb.current = callbacks

  const pointerId = useRef<number | null>(null)
  const start = useRef({ x: 0, y: 0 })
  const moved = useRef(false)
  const longPressFired = useRef(false)
  const lastTapAt = useRef(0)
  const longPressTimer = useRef<number | null>(null)
  const exitTimer = useRef<number | null>(null)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  useEffect(
    () => () => {
      clearLongPress()
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
    },
    [clearLongPress],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (pointerId.current !== null || exitTimer.current !== null) return
      pointerId.current = e.pointerId
      start.current = { x: e.clientX, y: e.clientY }
      moved.current = false
      longPressFired.current = false
      setDrag({ dx: 0, dy: 0 })
      e.currentTarget.setPointerCapture?.(e.pointerId)
      clearLongPress()
      longPressTimer.current = window.setTimeout(() => {
        longPressTimer.current = null
        if (!moved.current) {
          longPressFired.current = true
          setDrag(null)
          cb.current.onLongPress()
        }
      }, LONG_PRESS_MS)
    },
    [clearLongPress],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerId.current || longPressFired.current) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      if (!moved.current && Math.hypot(dx, dy) > SLOP) {
        moved.current = true
        clearLongPress() // a drag kills the long-press
      }
      if (moved.current) {
        // Only allow upward vertical travel (downward drags are just scroll intent).
        setDrag({ dx, dy: Math.min(dy, 0) })
      }
    },
    [clearLongPress],
  )

  const finish = useCallback(() => {
    pointerId.current = null
    setDrag(null)
  }, [])

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerId.current) return
      clearLongPress()
      if (longPressFired.current) {
        finish()
        return
      }
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      const horizontal = Math.abs(dx) >= Math.abs(dy)

      if (moved.current && horizontal && dx >= H_THRESHOLD) {
        // Approve: animate out to the right, then notify.
        pointerId.current = null
        setDrag(null)
        setExit('right')
        exitTimer.current = window.setTimeout(() => {
          exitTimer.current = null
          setExit(null)
          cb.current.onSwipeRight()
        }, EXIT_MS)
        return
      }
      if (moved.current && horizontal && dx <= -H_THRESHOLD) {
        pointerId.current = null
        setDrag(null)
        setExit('left')
        exitTimer.current = window.setTimeout(() => {
          exitTimer.current = null
          setExit(null)
          cb.current.onSwipeLeft()
        }, EXIT_MS)
        return
      }
      if (moved.current && !horizontal && dy <= -V_THRESHOLD) {
        finish()
        cb.current.onSwipeUp()
        return
      }
      if (!moved.current) {
        const now = e.timeStamp || Date.now()
        if (now - lastTapAt.current < DOUBLE_TAP_MS) {
          lastTapAt.current = 0
          finish()
          cb.current.onDoubleTap()
          return
        }
        lastTapAt.current = now
      }
      finish()
    },
    [clearLongPress, finish],
  )

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerId.current) return
      clearLongPress()
      finish()
    },
    [clearLongPress, finish],
  )

  let style: CSSProperties
  if (exit) {
    const sign = exit === 'right' ? 1 : -1
    style = {
      transform: `translateX(${sign * 120}%) rotate(${sign * 8}deg)`,
      opacity: 0,
      transition: `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease-in`,
    }
  } else if (drag && (drag.dx !== 0 || drag.dy !== 0)) {
    style = {
      transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx * 0.04}deg)`,
      transition: 'none',
    }
  } else {
    style = { transform: 'translate(0px, 0px)', transition: 'transform 160ms ease-out' }
  }

  let hint: GestureHint = null
  if (drag) {
    const horizontal = Math.abs(drag.dx) >= Math.abs(drag.dy)
    if (horizontal && drag.dx >= H_THRESHOLD) hint = 'approve'
    else if (horizontal && drag.dx <= -H_THRESHOLD) hint = 'reject'
    else if (!horizontal && drag.dy <= -V_THRESHOLD) hint = 'delegate'
  }

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    style,
    hint,
    exiting: exit !== null,
  }
}
