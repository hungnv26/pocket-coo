# Pocket COO — Technical Plan

**Tech Lead deliverable.** Source of truth for architecture, file ownership, and work packages. Read `team/SPEC.md` first; this plan implements it exactly.

## Stack (and why it deviates from team defaults)

**Vite + React + TypeScript, plain CSS, pnpm.** No Next.js: the spec (D1–D2) requires a purely client-side single-page app with no backend, no routing, and no server rendering — Next.js adds nothing here and slows a 1-day build. No Tailwind / UI kit / gesture lib: two surfaces and a handful of components; pointer events cover all gestures; plain CSS keeps the bundle and mental overhead minimal. Persistence is `localStorage` (D2/D11), no database.

- Node/tooling: Vite 8, React 19, TS 6, Vitest 4 (already installed, `pnpm install` done).
- **Dev server:** `pnpm dev` → http://localhost:5173 (strictPort — if 5173 is busy, stop the other process; do not silently drift ports).
- **Tests:** `pnpm test` (vitest run) or `pnpm test:watch`. Node environment, files matching `src/**/*.test.ts`.
- **Build gate:** `pnpm build` (tsc -b + vite build) must pass before every commit.

## Layered architecture (D10 — enforced)

```
src/domain/          Pure TS. Types, reducer, selectors, seed. NO React, NO browser APIs,
                     NO imports from other layers. Unit-testable in node.
src/application/     Use-cases: command parser, command executor, agent-engine LOGIC
                     (what happens, not when). Imports domain only. No React, no timers.
src/infrastructure/  Adapters: localStorage persistence, setTimeout scheduler.
                     The ONLY files that touch browser APIs outside React components.
src/presentation/    React components, gestures, sheets, toasts. Props-driven: components
                     never import the store or infrastructure — P3 wires them in App.tsx.
```

Rule of thumb: if a domain/application file imports `react` or references `window`/`localStorage`/`setTimeout`, the review fails.

## Data model

Defined and **frozen** in `src/domain/types.ts` (change only by agreement recorded here):

- `AgentId = 'backend' | 'marketing' | 'finance' | 'qa' | 'security'`; `Agent { id, name, status: { state: working|waiting_approval|blocked|idle, message, updatedAt } }`.
- `ApprovalCard { id, agentId, title, summary, confidence (0–100), impact, urgency, risk (low|medium|high), recommendedAction (approve|reject|review), reasoning, details, createdAt, status (pending|approved|rejected|delegated|delayed), resolution? { decidedAt, target? } }`.
- `Decision = approve | reject | delegate{target: AgentId | 'tomorrow'}` (target `'tomorrow'` ⇒ card status `delayed`).
- `Command` union: `approve_bulk_low_risk | reject_match{agentId?, keyword} | explain_agent{agentId} | delay_tomorrow | assign_agent{target} | unknown{raw}`.
- `AppState { cards: ApprovalCard[], agents: Record<AgentId, Agent> }` with `AppAction` union (`DECIDE`, `BULK_APPROVE_LOW_RISK`, `REJECT_MATCH`, `CARD_ARRIVED`, `AGENT_STATUS`, `RESET`). One reducer owns all transitions; timestamps are always passed in (`now`) — never read `Date.now()` inside domain code.
- Constants: `SEED_CARD_COUNT=20`, `MAX_PENDING=30`, `SPAWN_INTERVAL_MS=[20s,40s]`, resume offsets ~1.5s/~4.5s.

UI contracts (component props, `Surface`, `SheetRequest`, `ToastItem`) live in `src/presentation/contracts.ts`.

## Page / route map

Single-page app, **no router** — two surfaces toggled by a `Surface = 'home' | 'inbox'` state in `App.tsx` (D6: exactly two surfaces, no tabs, no nested navigation):

| Surface | What it shows | Entry/exit |
|---|---|---|
| **Home** (default) | "N approvals waiting" (tap → Inbox), "M critical alerts", 5 agent status lines, footer "Reset demo" | App start; back from Inbox |
| **Inbox** | Pending card stack (all 7 fields + 5 buttons per card), persistent command bar (bottom half, one-handed), back-to-Home affordance | Tap approvals count on Home |
| Bottom sheets (over Inbox, not routes) | `reasoning` ("Why?" / long-press), `details` (double-tap), `delegate` (swipe-up) — each with in-sheet Approve/Reject; dismiss via button or swipe-down | One sheet open at a time (`SheetRequest \| null`) |
| Toasts | 3-second confirmations, overlay | Any decision/command/new-card event |

Layout hard rules: 430px max-width phone frame centered on desktop; ≥44×44px tap targets (already enforced on `button` in `index.css`); no horizontal scroll at 390×844.

## Work packages

Ownership is exact: **no two parallel packages may touch the same file.** Shared contract files (`src/domain/types.ts`, `src/presentation/contracts.ts`) are additive-only during parallel work; breaking changes require both engineers' sign-off noted in the PR/commit message.

### P0 — Scaffold [sequential — DONE, committed by tech lead]

Vite + React + TS + Vitest project, layer directories, frozen domain types, presentation prop contracts, stub files with TODOs, phone-frame CSS, smoke test. `pnpm build` and `pnpm test` pass. Everything below starts from this commit.

### P1 — Core logic: domain + application [parallel]

**Owns:** `src/domain/reducer.ts`, `src/domain/selectors.ts`, `src/domain/seed.ts`, `src/application/commandParser.ts`, `src/application/commands.ts`, `src/application/agentEngine.ts`, all `src/**/*.test.ts` for these (replace `src/domain/types.test.ts` contents freely). May add fields to `types.ts` (additive only).

**Build:**
1. `reducer.ts` — implement every `AppAction`. `DECIDE` sets status + resolution (`delegate` with target `'tomorrow'` ⇒ `delayed`, else `delegated`). `CARD_ARRIVED` drops the card if pending ≥ 30. Pure and total: unknown ids are no-ops, never throw.
2. `selectors.ts` — `pendingCards` (stable order: oldest first = inbox top), `queueCounts` (critical = pending ∧ (risk high ∨ urgency high)), `latestPendingForAgent` (most recent `createdAt`).
3. `seed.ts` — 20 handwritten deterministic cards: every agent ≥ 2 cards, all risk levels; ≥ 2 Marketing cards containing "campaign"; ≥ 1 Backend card; realistic titles/summaries/impact strings; non-empty `reasoning` and `details` on every card; initial agent statuses `waiting_approval`/`working` with sensible messages.
4. `commandParser.ts` — case-insensitive pattern rules for the 5 shapes (tolerate minor wording drift: "approve all low risk", "assign to QA agent"); anything else → `unknown`.
5. `commands.ts` — `executeCommand` maps Command + state → `CommandOutcome { actions, message, openReasoningForCardId?, showHelp? }`. Bulk approve reports count ("Approved 4 low-risk actions"); `reject_match` filters agent + keyword against title/summary; `delay_tomorrow`/`assign_agent` act on the top pending card; empty matches produce a helpful message with zero actions.
6. `agentEngine.ts` — `spawnCard` (template pool per agent, rotating, unique ids, respects cap), `nextSpawnDelayMs` (20–40s, injectable `random`), `resumeScript` returning timed `AgentStatus` steps per decision kind (approve → in-progress @~1.5s → completed @~4.5s; reject → "revising"; delegate → handoff; delay → "stood down until tomorrow").

**Consumes:** `domain/types.ts` only. **Provides:** every pure function P3 wires up.

**Done when:** `pnpm test` green with unit tests covering: all 5 command shapes + 3 unknown inputs; reducer for each action incl. cap and delayed vs delegated; seed invariants (exactly 20 pending, agent/risk coverage, "campaign" cards, non-empty reasoning/details); bulk-approve leaves 0 low-risk pending; `resumeScript` step ordering. `pnpm build` passes. No React/browser imports anywhere in owned files (grep check: `grep -rE "from 'react'|window\.|localStorage|setTimeout" src/domain src/application` returns nothing).

### P2 — Presentation: surfaces, cards, gestures, sheets [parallel]

**Owns:** `src/presentation/contracts.ts` (additive changes), plus new files: `src/presentation/HomeSurface.tsx`, `InboxSurface.tsx`, `CardView.tsx`, `useCardGestures.ts`, `BottomSheetHost.tsx`, `CommandBar.tsx`, `ToastHost.tsx`, `fixtures.ts` (fake props for standalone dev), `src/presentation/dev/DevHarness.tsx` (optional playground), and `src/index.css`.

**Build (all components props-driven per `contracts.ts`; use `fixtures.ts` + temporarily point `main.tsx` at `DevHarness` locally, but DO NOT commit changes to `main.tsx`/`App.tsx` — those are P3's):**
1. `HomeSurface` — approvals count (tappable, opens Inbox), critical count, 5 agent status lines, "Reset demo" footer button.
2. `CardView` — all 7 fields visible (confidence rendered as `%`), risk badge, and 5 labeled buttons: `Approve`, `Reject`, `Delegate`, `Why?`, `Details`.
3. `useCardGestures` — **pointer events only** (pointerdown/move/up, works with mouse per acceptance note): horizontal drag ≥ ~80px right/left → approve/reject with translate + fade-out animation; vertical drag up → delegate sheet; hold ≥ 500ms without movement → reasoning sheet; two pointerups < 300ms apart → details sheet. Long-press must not fire after a drag; double-tap must not fire the hold. Buttons always work independently of gestures.
4. `BottomSheetHost` — one host renders reasoning / details / delegate sheets over the Inbox; slide-up animation; Close button + swipe-down dismiss; Approve/Reject buttons inside reasoning and details sheets; delegate sheet lists Backend, Marketing, Finance, QA, Security, "Tomorrow (delay)".
5. `CommandBar` — fixed near the bottom of Inbox (one-handed reach), text input + Send, Enter submits, renders `commandFeedback` inline incl. the 5-example help block (import `COMMAND_EXAMPLES`).
6. `ToastHost` — stacked toasts, 3s auto-dismiss handled by P3 (host just renders the list) — or self-timed via CSS animation; either way P3 passes `toasts`.
7. `index.css` — all styling. One accent color, big readable text, no horizontal scroll at 390×844.

**Consumes:** `domain/types.ts`, `presentation/contracts.ts`. **Provides:** components P3 mounts.

**Done when:** `pnpm build` passes; DevHarness (with fixtures) demonstrates every gesture and every button opening the right sheet/callback; all 5 buttons ≥ 44×44px; no file outside `src/presentation/` + `src/index.css` modified.

### P3 — Integration: wiring, persistence, engine loop, polish [sequential — starts after P1 and P2 merge]

**Owns:** `src/App.tsx`, `src/main.tsx`, `src/infrastructure/persistence.ts`, `src/infrastructure/scheduler.ts`, `index.html`, plus a new `src/application/store.ts` (React-free composition helpers if useful) — and final touch-ups anywhere with owners' awareness.

**Build:**
1. `App.tsx` — `useReducer(reducer, undefined, init)` where `init` = `loadState() ?? seedState(Date.now())`; surface state, sheet state, toast queue (3s auto-expiry), command feedback state; wire every P2 callback to dispatches + toasts (approve/reject/delegate toasts: "Approved: <title>", "Delegated to QA", …).
2. Persistence — implement `persistence.ts` (versioned key `pocket-coo/v1`, try/catch on load); `useEffect` saves on every state change; "Reset demo" → `clearState()` + `RESET` with fresh seed + cancel scheduled work.
3. Engine loop — implement `scheduler.ts`; on mount schedule `spawnCard` via `nextSpawnDelayMs` (reschedule after each spawn; skip when capped; "New request from Marketing" toast + count bump); on every decision schedule that agent's `resumeScript` as timed `AGENT_STATUS` dispatches. Set deciding agent to `waiting_approval`-appropriate states per spec Flow E. Clean up timers on unmount/reset (StrictMode double-mount safe).
4. Command flow — command bar submit → `parseCommand` → `executeCommand` → dispatch actions, toast `message`, open reasoning sheet when `openReasoningForCardId`, show help on `showHelp`.
5. Polish + acceptance pass — run the full SPEC §9 checklist at 390×844; fix console errors; verify reload persistence and reset; confirm counts update < 1s.

**Done when:** every item in the acceptance mapping below passes manually in a desktop browser; `pnpm build` + `pnpm test` green.

## Dependency order

```
P0 scaffold (done)
   ├── P1 core logic      [parallel]
   ├── P2 presentation    [parallel]
   └── P3 integration     [sequential — needs P1 + P2 merged]
```

## Acceptance checklist → responsible package

| SPEC §9 item | Primary | Supporting |
|---|---|---|
| 1. Inbox renders 20 cards, 7 fields, 5 buttons | P2 (card/inbox UI) | P1 (seed), P3 (wiring) |
| 2. Every action by gesture AND button | P2 (gestures + buttons) | P3 (dispatch wiring, toasts) |
| 3. Delegate flow + count decrement | P2 (delegate sheet) | P1 (reducer), P3 (counts/toast) |
| 4. Depth sheets correct, non-destructive | P2 (sheets) | P1 (reasoning/details content in seed) |
| 5. Five commands parse and execute + help | P1 (parser + executor) | P2 (command bar UI), P3 (flow wiring) |
| 6. Widget counts always accurate | P1 (selectors) | P3 (single-store wiring guarantees sync) |
| 7. Agent loop visible end-to-end | P1 (spawn/resume logic) | P3 (scheduler timing) |
| 8. Persistence, reset, hygiene, 390×844 layout | P3 (persistence/reset) | P2 (layout), all (console hygiene) |

## Conventions

- Commits: small, prefixed `[P1]`/`[P2]`/`[P3]`; `pnpm build && pnpm test` must pass before each.
- No new dependencies without tech-lead sign-off (none are anticipated).
- IDs: `card-<agentId>-<n>` for seed, `card-gen-<timestamp>-<n>` for spawned — stable and unique.
- All times are epoch ms numbers (JSON-safe for localStorage).
