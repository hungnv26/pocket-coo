# Decisions log

Append-only. Each entry: date, package, decision, rationale.

## 2026-07-21 — P2 (Presentation)

- **Added `CommandBarProps` to `src/presentation/contracts.ts` (additive only).** The
  command bar is its own component inside InboxSurface and needed a named props
  contract; it mirrors `InboxSurfaceProps.commandFeedback` exactly. No existing
  contract was renamed or removed.
- **Swipe approve/reject plays a ~220 ms exit animation before invoking the
  callback.** PLAN asks for "translate + fade-out"; since the parent removes the
  card from the list on decision, the hook animates first and calls
  `onApprove`/`onReject` after the animation so the removal doesn't cut it off.
  Button-triggered decisions invoke callbacks immediately (P3 may remove
  instantly — acceptable per spec).
- **Swipe-up (delegate) snaps the card back and opens the delegate sheet** (no
  exit animation) because the card stays pending until a target is picked.
  Downward drags are ignored (treated as scroll intent) so the list still scrolls.
- **Sheet dismissal surfaces:** Close button, swipe-down (pointer drag ≥ 80 px on
  the grip/header area), and backdrop tap. Backdrop tap is an extra
  non-destructive dismiss beyond the two required — spec allows closing without
  deciding.
- **Delegate sheet has no in-sheet Approve/Reject footer.** SPEC Flow B only
  requires in-sheet decision buttons on the reasoning and details sheets; the
  delegate sheet is a pure picker (Flow C) plus Close.
- **`ToastHost` is a pure renderer.** P3 owns the toast queue and the 3-second
  auto-expiry (PLAN offered either option); the host only renders `toasts` with a
  CSS entrance animation and returns `null` when empty.
- **`BottomSheetHost` renders `null` when `request` is set but `card` is null**
  (e.g. card resolved by a bulk command while a sheet was open) — a guard so P3
  never has to race sheet-close against card removal.
- **Dev-only `src/presentation/dev/mount.ts`** lets the DevHarness be mounted
  from the browser console on the vite dev server without editing `main.tsx`
  (which P3 owns). Nothing in app code imports `dev/` or `fixtures.ts`.
- **Palette:** one accent (blue `#4f8cff`) + two semantic colors only — danger
  red (high risk/urgency, reject) and amber (medium). Low risk/urgency renders
  neutral/dim, per the "no rainbow" design rule.
