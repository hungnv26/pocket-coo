# Team decisions log

Append-only. Each entry: date, package, decision, rationale.

## 2026-07-21 — P1 (core logic)

1. **`reject_match` rejects ALL matching pending cards, not just one.** SPEC Feature 2 says "rejects the pending card(s) … matching" — plural is allowed. The confirmation message adapts: single match → `Rejected: <title>`; multiple → `Rejected N requests matching …`.
2. **`reject_match` with an agent but no keyword (e.g. "reject marketing") matches all pending cards of that agent.** An empty keyword with no agent filter matches nothing (never mass-reject on empty input).
3. **Parser tolerance beyond the five canonical strings:** bulk approve accepts any "approve … low(-)risk"; explain accepts "ask [the] <agent> [agent] …"; assign accepts assign/delegate/hand off + agent name; delay accepts delay/postpone/… tomorrow. Recognition precedence: bulk-approve → ask → assign → delay → reject → unknown. Anything else is `unknown` (D13 help).
4. **`spawnCard` is deterministically round-robin** (agents take turns; each agent rotates its template pool, keyed off the count of `card-gen-*` ids in state). The injected `random` parameter is kept for API compatibility but unused — determinism makes QA/demo repeatable, matching the spirit of D8's "deterministic" seed.
5. **`resumeScript` covers only the deciding agent.** Approve/reject/delegate return two steps (in-progress @1.5s → done @4.5s, per `RESUME_*` constants); delay ("tomorrow") returns one step ("Stood down until tomorrow"). If P3 wants the delegate *target* agent to also react, that is a P3 wiring choice — the pure function does not script other agents.
6. **`CARD_ARRIVED` drops cards with a duplicate id** (in addition to the ≥30 pending cap) so replayed dispatches (React StrictMode double-effects) cannot corrupt state.
7. **Shared matching helper `cardMatches` lives in `src/domain/reducer.ts`** and is exported for the command executor, so REJECT_MATCH counting in `executeCommand` and the reducer can never disagree.
8. **No changes to `src/domain/types.ts`.** The frozen contract was sufficient; nothing was added.

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
