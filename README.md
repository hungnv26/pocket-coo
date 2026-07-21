# Pocket COO

**Pocket COO** is a mobile-first web app that reframes your phone as an executive decision surface: an approval inbox where you can triage 20+ pending agent decisions in under five minutes with swipe-speed gestures and command-line bulk actions, see each agent resume work immediately after you decide, and stay aware of critical alerts at a glance from the Home screen.

**Target user:** Small-business owners and solo founders who run cloud AI-agent teams and are away from a desk most of the day. You are time-poor, decision-rich, and use your phone one-handed.

**Why it matters:** AI-agent organizations are becoming real. The bottleneck is no longer labor—it's human judgment. This app makes decision-making fast enough to do one-handed in the gaps of your day.

---

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm installed

### Installation and running

```bash
# Install dependencies
pnpm install

# Start the dev server (http://localhost:5173)
pnpm dev

# Run unit tests (81 tests)
pnpm test

# Watch mode
pnpm test:watch

# Build for production
pnpm build

# Preview the production build
pnpm preview
```

The app runs at **http://localhost:5173** in a mobile phone frame (430px max-width, centered on desktop). Dev server uses strictPort — if 5173 is busy, stop the other process; it does not drift ports.

---

## How to Use

### Home Surface

When you open the app, you see:

- **Approvals waiting** (tappable) — count of pending decisions; tap to open the Inbox
- **Critical alerts** — count of high-risk or high-urgency pending cards
- **Agent status lines** — one line per agent (Backend, Marketing, Finance, QA, Security) showing current state and message (e.g., "Backend: executing now…")
- **Reset demo** button (footer) — restores the demo to its initial 20-card state

### Inbox Surface

The Inbox displays a vertical stack of pending decision cards. Each card shows all seven fields:

- **Title** — brief request name
- **Summary** — one-line explanation
- **Confidence** — as a percentage (0–100)
- **Impact** — estimated business impact (e.g., "+$1,200 MRR", "affects 3,000 users")
- **Urgency** — low, medium, or high (badge colored by level)
- **Agent** — requesting agent name (blue chip)
- **Recommended action** — approve, reject, or review

Below each card are five labeled buttons: **Approve**, **Reject**, **Delegate**, **Why?**, **Details**.

### Five Gestures (and Button Fallbacks)

Every gesture has a button equivalent so the app works with mouse and keyboard.

| Gesture | Button | Effect |
|---------|--------|--------|
| **Swipe right** (drag ≥80px right) | Approve button | Approve the card; it leaves the queue with a confirmation toast. Card animates out. |
| **Swipe left** (drag ≥80px left) | Reject button | Reject the card; it leaves the queue with a confirmation toast. Card animates out. |
| **Swipe up** (drag ≥80px up) | Delegate button | Open the delegate bottom sheet to pick a target (Backend, Marketing, Finance, QA, Security, or "Tomorrow"). |
| **Long-press** (hold ≥500ms without moving) | Why? button | Open a bottom sheet showing the agent's reasoning in plain language. |
| **Double-tap** (two taps <300ms apart) | Details button | Open a bottom sheet showing the full description, risk level, created timestamp, and agent. |

All five buttons are always visible on the card and always respond to clicks. Gestures and buttons can be used interchangeably.

### Five Voice-Style Text Commands

The Inbox has a persistent command bar at the bottom (one-handed reach). Type a command and press Enter or tap the Send button. The parser is case-insensitive and tolerates minor wording drift.

| Command | Effect | Confirmation |
|---------|--------|--------------|
| `Approve all low-risk actions` | Approve every pending card with `risk = low` | Toast + persistent message: "Approved N low-risk actions" |
| `Reject marketing campaign` | Reject all pending Marketing cards matching "campaign" | "Rejected N requests matching Marketing "campaign"" |
| `Ask Backend why this changed` | Open the reasoning sheet for the most recent pending Backend card | Sheet opens inline |
| `Delay until tomorrow` | Move the top pending card into a delayed state | "Delayed until tomorrow: <title>" |
| `Assign to QA` | Delegate the top pending card to the QA agent | "Delegated to QA: <title>" |

Typing gibberish or an unrecognized command shows a help message listing all five supported commands. No decisions are made on invalid input.

### Depth Sheets (Bottom Sheets)

When you open a reasoning, details, or delegate sheet:

- The sheet slides up from the bottom with a semi-transparent backdrop
- **Close button** (top-right) — dismiss without deciding
- **Swipe down** (≥80px drag down on the header) — dismiss without deciding
- **Backdrop tap** — dismiss without deciding
- **Approve/Reject inside reasoning/details sheets** — resolve the card and close the sheet (stays pending if you close without deciding)
- **Delegate sheet** — pure picker; selecting a target (or "Tomorrow") immediately delegates and closes the sheet

### Reset Demo

The "Reset demo" button (Home footer) clears all decisions, restores the initial 20 pending cards, resets all agent statuses, and cancels any scheduled work. The app returns to its initial state—useful for re-demoing or starting fresh.

---

## Architecture Overview

Pocket COO uses a **layered architecture** with strict separation of concerns:

```
src/domain/           Pure TypeScript. Reducer, selectors, seed data, types.
                      No React, no browser APIs. Unit-testable in Node.
                      
src/application/      Use-cases: command parser, command executor, agent-engine logic.
                      Imports domain only. No React, no timers, no browser APIs.
                      
src/infrastructure/   Adapters: localStorage persistence, setTimeout scheduler.
                      The only files that touch browser APIs outside React.
                      
src/presentation/     React components: surfaces, cards, gestures, sheets, toasts.
                      Props-driven; never import the store or infrastructure.
```

This layering enables:

- **Future native clients** — domain + application are React-free, so they can be reused in native iOS/Android apps
- **Testability** — domain and application logic runs in Node without jsdom
- **Clear ownership** — each layer has strict dependencies (presentation → application → domain, never backwards)
- **Deterministic QA** — pure reducer, no hidden state or asynchrony inside domain logic

### Key Files

- `src/domain/types.ts` — frozen type contract: Agent, ApprovalCard, Command, AppState, AppAction, constants
- `src/domain/reducer.ts` — single `appReducer` owning all state transitions (DECIDE, CARD_ARRIVED, AGENT_STATUS, etc.)
- `src/domain/selectors.ts` — derived state: `pendingCards`, `queueCounts`, `latestPendingForAgent`
- `src/domain/seed.ts` — 20 deterministic seed cards covering all agents and risk levels
- `src/application/commandParser.ts` — rule-based parser for the five command shapes
- `src/application/commands.ts` — `executeCommand` mapping commands to action lists and confirmations
- `src/application/agentEngine.ts` — spawn templates per agent, resume-status scripts
- `src/infrastructure/persistence.ts` — localStorage load/save with validation
- `src/infrastructure/scheduler.ts` — centralized timer/interval manager
- `src/presentation/App.tsx` — React root: reducer mount, surface routing, sheet/toast/command state
- `src/presentation/HomeSurface.tsx`, `InboxSurface.tsx` — the two surfaces
- `src/presentation/CardView.tsx` — card display + 5 buttons
- `src/presentation/useCardGestures.ts` — pointer-event hook for all five gestures
- `src/presentation/BottomSheetHost.tsx` — reasoning, details, delegate sheets
- `src/presentation/CommandBar.tsx` — text input + command feedback
- `src/presentation/ToastHost.tsx` — transient message overlays
- `src/index.css` — all styling: dark theme, one accent, 44px tap targets, 390×844 responsive layout

---

## Project Structure

```
pocket-coo/
├── src/
│   ├── domain/
│   │   ├── types.ts             (frozen contract)
│   │   ├── types.test.ts        (type test)
│   │   ├── reducer.ts           (AppAction → AppState)
│   │   ├── reducer.test.ts      (100+ test cases)
│   │   ├── selectors.ts         (pending, counts, latestForAgent)
│   │   ├── selectors.test.ts    (derived-state tests)
│   │   ├── seed.ts              (20 cards, initial agent status)
│   │   └── seed.test.ts         (invariants: 20, coverage, non-empty content)
│   ├── application/
│   │   ├── commandParser.ts     (raw string → Command)
│   │   ├── commandParser.test.ts (5 commands + 3 unknown)
│   │   ├── commands.ts          (Command + state → CommandOutcome)
│   │   ├── commands.test.ts     (bulk, match filtering, empty matches)
│   │   ├── agentEngine.ts       (spawn templates, resume scripts)
│   │   └── agentEngine.test.ts  (template rotation, timing, step ordering)
│   ├── infrastructure/
│   │   ├── persistence.ts       (localStorage versioning & validation)
│   │   └── scheduler.ts         (centralized timers, cleanup on reset)
│   ├── presentation/
│   │   ├── contracts.ts         (props contracts for P2 components)
│   │   ├── HomeSurface.tsx      (approvals, agents, reset button)
│   │   ├── InboxSurface.tsx     (card list, command bar, back button)
│   │   ├── CardView.tsx         (7-field card + 5 buttons)
│   │   ├── useCardGestures.ts   (pointer → approve/reject/delegate/explain/details)
│   │   ├── BottomSheetHost.tsx  (reasoning/details/delegate sheets)
│   │   ├── CommandBar.tsx       (input + feedback)
│   │   ├── ToastHost.tsx        (transient overlays)
│   │   ├── fixtures.ts          (fake props for standalone dev)
│   │   └── dev/
│   │       ├── DevHarness.tsx   (optional dev playground)
│   │       └── mount.ts         (console mount helper)
│   ├── App.tsx                  (React root, surface routing, wiring)
│   ├── main.tsx                 (entry point)
│   └── index.css                (all styling)
├── vite.config.ts
├── tsconfig.json
├── package.json
├── team/
│   ├── SPEC.md                  (product spec & acceptance checklist)
│   ├── PLAN.md                  (technical plan & work packages)
│   ├── QA_REPORT.md             (8-item checklist, 1 resolved bug)
│   ├── DECISIONS.md             (team decisions log)
│   └── DELIVERY.md              (this build's delivery report)
└── README.md                    (you are here)
```

---

## Testing

The project includes **81 unit tests** across 7 test files, all passing:

- `domain/types.test.ts` — type-level checks
- `domain/reducer.test.ts` — state transitions, cap, cascading status updates
- `domain/selectors.test.ts` — pending cards, counts, agent lookup
- `domain/seed.test.ts` — seed invariants (20 cards, coverage, non-empty reasoning/details)
- `application/commandParser.test.ts` — five command shapes, tolerance, unknown fallback
- `application/commands.test.ts` — execution, bulk filtering, messaging, empty matches
- `application/agentEngine.test.ts` — template rotation, spawn uniqueness, resume timing

Run tests with:

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

---

## Build and QA Status

- **Build:** PASS — `pnpm build` compiles with no errors; tsc -b + vite build clean
- **Production bundle:** 235 KB JavaScript, 10 KB CSS (raw); 75 KB / 2.6 KB gzipped
- **Tests:** PASS — 81/81 tests, 0 failures
- **QA:** PASS — full SPEC §9 acceptance checklist verified (8 items); 1 integration bug found and fixed in commit 83218a7

### QA Checklist Summary

| # | Item | Result |
|---|------|--------|
| 1 | Inbox renders 20 cards, 7 fields, 5 buttons | ✅ PASS |
| 2 | Every action works by gesture AND button (drag, hold, double-tap, swipe-up) | ✅ PASS |
| 3 | Delegate flow opens sheet, picks target, updates counts | ✅ PASS |
| 4 | Depth sheets show reasoning/details, are non-destructive, have in-sheet decisions | ✅ PASS |
| 5 | All five commands parse, execute, show confirmation, show help on unknown | ✅ PASS |
| 6 | Home counts always accurate and sync with Inbox | ✅ PASS |
| 7 | Agent loop spawns cards, agent status visibly resumes after decision | ✅ PASS |
| 8 | Persistence survives reload, reset restores seed state, no console errors, 390×844 layout OK | ✅ PASS |

---

## Known Limitations (MVP Scope)

### Non-Blocking QA Observations

1. **Duplicate spawn titles in long sessions.** After ~10 minutes at the 30-card cap, spawned cards may repeat titles (e.g., two "Launch win-back email campaign" cards from Marketing). The template pool rotates per-agent; this is deterministic by design but looks odd side-by-side. Not an issue for the 5-minute demo.

2. **Mid-word wrap in impact metrics at 390px.** Impact text like "affects 12 legacy integrations" can break mid-word ("integration/s") inside narrow boxes. Cosmetic; readability not materially affected.

3. **Synthetic Enter keypress limitation.** Some automation tooling doesn't fire synthetic keypress events correctly; the Send button works. Real keyboards enter correctly; this is a test-harness quirk, not a product issue.

### Intentional MVP Cuts

- **No undo.** Decisions are irreversible (3-second toast confirms each one). Undo adds state complexity; toast feedback is sufficient for the demo.
- **No real agents.** Mock agent engine on a timer only; no server backend, no actual work execution.
- **Text-based commands only.** Web Speech API is a stretch goal, off by default. Keyboard commands are deterministic and reliable.
- **No real voice input.** Web Speech API recognition is optional garnish; text input is the MVP.
- **No push notifications.** Alerts are in-app only (toasts, badge updates).
- **No undo/edit history.** Audit logs and decision history are out of scope.
- **No native iOS/Android apps.** Web app only (PWA-capable, runs on mobile Safari/Chrome).
- **No multi-user or roles.** Single owner, no auth, no settings.
- **No dashboard or analytics.** Approval inbox only; no charts, filters, or decision history UI.

---

## Future Improvements (Post-MVP)

1. **Web Speech API** — optional mic button in command bar for hands-free commands ("Approve all low-risk actions" spoken).
2. **Real agent backend** — connect to actual AI agents (Claude API, custom LLMs) to spawn real approval requests and execute decisions.
3. **Native iOS/Android apps** — SwiftUI/Kotlin ports reusing domain + application layers.
4. **Undo** — decision stack with rollback UI.
5. **Push notifications** — OS notifications for new critical requests.
6. **Decision audit trail** — searchable history of all decisions with reasoning.
7. **Agent onboarding** — simple form to register new agents and their types.
8. **Advanced filtering** — search pending cards by agent, risk, urgency, keyword.
9. **Persistent themes** — light/dark mode toggle.
10. **i18n** — multi-language support.

---

## Contributing

The project follows strict layered architecture (PLAN.md § Layered architecture). Before committing:

1. Ensure `pnpm build && pnpm test` pass locally.
2. Follow the layer rules: domain has no React/browser APIs, application has no React, presentation imports domain/application only.
3. Add tests for new logic (especially domain/application).
4. Run `oxlint` if using the linter.

For multi-engineer work, consult `team/PLAN.md` on file ownership and contracts.

---

## License

Proprietary. Built for Pocket COO.
