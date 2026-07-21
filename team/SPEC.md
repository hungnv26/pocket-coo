# Pocket COO — Product Spec (MVP)

**Product name:** Pocket COO
**Form:** Mobile-first web app (PWA-style), runs locally, no backend database.
**Build budget:** 1 day, 2–3 engineers.
**Owner of this document:** Product Manager. All decisions below are final; there are no open questions.

---

## 1. Business rationale

AI-agent organizations are becoming real: a small business can run Backend, Marketing, Finance, QA, and Security work through autonomous agents. The bottleneck is no longer labor — it is **human judgment**. Owners do not want another dashboard; they want to make decisions from their phone in the gaps of their day.

Pocket COO reframes the phone as an **executive command surface**: an approval inbox where every screen answers exactly one question — *"What requires my decision?"* The demoable value proposition: an owner clears 20 pending decisions (approve 15, reject 3, delegate 2), fully understanding each one, in under five minutes, and visibly sees agents resume work after each decision.

**Why now, why this shape:** The differentiator is not agent intelligence (mocked for MVP) but the **decision UX**: swipe-speed triage, one-tap depth, and command-level bulk actions. That UX is what we validate.

---

## 2. Target user and primary action

The target user is a **small-business owner or solo founder who runs a cloud AI-agent team** and is away from a desk most of the day. They are time-poor, decision-rich, and use their phone one-handed. The **single primary action** is: **triage a pending agent decision — approve, reject, or delegate — with one gesture or one tap**, confident they understood the request because summary, confidence, impact, and urgency were visible on the card, and depth (details, reasoning) was never more than one tap away.

---

## 3. Decisions log (each with rationale)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Ship as a mobile-first web app in a phone-sized layout (max-width ~430px, centered on desktop). | Fastest path to a demoable, QA-able product in one day; no store friction. |
| D2 | Agents are an in-memory mock engine on a timer; no server, no persistence beyond `localStorage`. | Zero infra risk; the loop (request → decide → resume) is fully demonstrable client-side. |
| D3 | Voice = **text command bar** parsing structured commands; Web Speech API is a stretch goal, off by default. | Text input is deterministic and machine-checkable; speech recognition is flaky in CI/QA. |
| D4 | Gestures: swipe right = approve, left = reject, up = delegate, long-press = explain, double-tap = details. Every gesture has a visible button equivalent on the card. | Hard requirement; buttons make the app QA-able and accessible with mouse/keyboard. |
| D5 | Delegate targets are the five agents plus "Tomorrow (delay)"; picker is a bottom sheet. | Keeps delegate a one-tap follow-up, no nested navigation. |
| D6 | Exactly two surfaces: **Home (widget summary)** and **Inbox**; details/reasoning/delegate open as bottom sheets over the Inbox. | Enforces "no tabs, no nested navigation"; every screen answers one question. |
| D7 | Risk level per card is precomputed by the mock engine (`low` / `medium` / `high`) and shown as part of urgency/impact; "low-risk" for bulk commands means `risk = low`. | Makes "Approve all low-risk actions" deterministic and testable. |
| D8 | Seed dataset: exactly **20 pending cards** at first load (mix across 5 agents and 3 risk levels), then the engine adds a new card every 20–40 s (capped at 30 pending). | Directly supports the 20-decision success metric and keeps the demo alive without flooding. |
| D9 | Decisions are irreversible in MVP (no undo); a 3-second toast confirms each decision. | Undo adds state complexity; toast gives enough feedback for the demo. |
| D10 | Layered architecture required: Presentation / Application / Domain / Infrastructure, with the domain layer free of React and browser APIs. | Hard requirement; enables future native clients. Architect owns the details. |
| D11 | State persists to `localStorage` so decided cards stay decided across reload; a visible "Reset demo" control restores the seed state. | Reload-survival is machine-checkable; reset makes QA repeatable. |
| D12 | Command parser is rule-based (keyword/pattern matching), not an LLM. | Deterministic, offline, testable; five command shapes don't need AI. |
| D13 | Unrecognized commands show a non-blocking "Didn't understand" message with the five supported command examples. | No dead ends; teaches the grammar. |

---

## 4. MVP scope — 3 core features

### Feature 1 — Approval Inbox (cards, gestures, depth-on-demand)
A vertical stack/list of pending-decision cards. Each card shows **all seven fields**: title, one-line summary, confidence (%), estimated impact, urgency, requesting agent, recommended action. Interactions:

- Swipe right → **Approve**; swipe left → **Reject**; swipe up → **Delegate** (opens delegate bottom sheet); long-press → **Explain reasoning** bottom sheet (the agent's rationale, in plain language); double-tap → **Details** bottom sheet (full description, risk level, timestamps, requesting agent).
- Every gesture has a labeled button fallback visible on (or on the expanded) card: `Approve`, `Reject`, `Delegate`, `Why?`, `Details`.
- Deciding a card removes it from the inbox with a confirmation toast; counts update immediately.

### Feature 2 — Command Bar (voice-style structured commands, text-first)
A persistent command input on the Inbox. Parses at least these five command shapes and executes them:

1. `Approve all low-risk actions` → approves every pending card with `risk = low` (bulk).
2. `Reject marketing campaign` → rejects the pending card(s) from the Marketing agent matching "campaign".
3. `Ask Backend why this changed` → opens the explain-reasoning sheet for the most recent pending Backend card.
4. `Delay until tomorrow` → delegates the top/selected card to "Tomorrow", removing it from the pending queue into a visible "Delayed" state.
5. `Assign to QA` → delegates the top/selected card to the QA agent.

Every executed command shows a result confirmation ("Approved 4 low-risk actions"). Unrecognized input → help message (D13). Optional Web Speech mic button may exist but is not required for acceptance.

### Feature 3 — Live Agent Loop + Widget Summary (Home)
- **Mock agent engine:** five agents (Backend, Marketing, Finance, QA, Security) generate approval requests on timers (D8). After the owner decides, the deciding agent visibly **resumes**: its status line changes (e.g. "Backend: deploying v2.1…" → "Backend: completed deployment") within ~5 seconds of the decision, closing the request → decide → resume loop on screen.
- **Home / widget surface:** a glanceable screen showing only actionable info: pending-approvals count ("3 approvals waiting"), critical-alert count ("1 critical alert" = pending high-risk/urgent cards), and one status line per agent. Tapping the approvals count opens the Inbox. Counts always match the actual queue.

---

## 5. Not building (explicitly out of scope)

- Real AI agents, LLM calls, or any network backend/API.
- Real speech recognition as a requirement (Web Speech API is optional garnish only).
- Authentication, accounts, multi-user, roles, settings screens.
- Push notifications, real OS home-screen widgets, offline service-worker sync.
- Undo/edit of decisions; decision history/audit-log screen.
- Dashboards, charts, tables, analytics, filters/search in the inbox.
- Native iOS/Android builds; tablet/desktop-optimized layouts (desktop just shows the phone frame).
- Dark/light theme toggle, i18n, onboarding tours.

---

## 6. User stories

1. As an owner, I open the app and see at a glance how many decisions are waiting and what each agent is doing, so I know whether to engage.
2. As an owner, I read a card's title, summary, confidence, impact, urgency, agent, and recommended action, and approve it with one swipe right (or the Approve button).
3. As an owner, I reject a bad request with one swipe left (or Reject button) and see it leave the queue.
4. As an owner, I swipe up (or tap Delegate) on a request that isn't mine to make, pick "QA" or "Tomorrow" from a bottom sheet, and move on.
5. As an owner, I long-press (or tap "Why?") to read the agent's reasoning before deciding.
6. As an owner, I double-tap (or tap "Details") to see the full request without leaving the inbox.
7. As an owner, I type "Approve all low-risk actions" to clear routine items in bulk and see how many were approved.
8. As an owner, after I approve a deployment, I see the Backend agent's status change to show it resumed and finished the work.
9. As an owner, I clear 20 decisions in under five minutes, one-handed, without ever navigating deeper than one sheet.

---

## 7. UX flows

**Flow A — Glance → Triage (happy path).**
Home shows "N approvals waiting", "M critical alerts", 5 agent status lines. Tap the approvals counter → Inbox. Top card visible with all 7 fields + 5 buttons. Swipe right → card animates out, toast "Approved: <title>", next card surfaces, Home counts decrement.

**Flow B — Depth on demand.**
In Inbox, long-press (or tap `Why?`) → bottom sheet with the agent's reasoning and a Close affordance plus Approve/Reject buttons inside the sheet (decide without leaving). Double-tap (or `Details`) → bottom sheet with full description, risk level, created time, agent; same in-sheet decision buttons. Dismiss sheet by button or swipe-down; card remains pending if no decision was made.

**Flow C — Delegate.**
Swipe up (or `Delegate`) → bottom sheet listing: Backend, Marketing, Finance, QA, Security, and "Tomorrow (delay)". Tap one → sheet closes, toast "Delegated to QA", card leaves the pending queue, counts update.

**Flow D — Command bar.**
Tap command input → type command → Enter/Send. Recognized: action executes + result toast/summary. Unrecognized: inline help listing the five supported commands. Bulk approve shows count affected.

**Flow E — Agent loop.**
Engine periodically adds a pending card (toast/badge indicates new arrival; counts increment). On any decision, the requesting agent's status line on Home transitions to an "in progress" then "completed"/"resumed" message within ~5 s (approve), or an appropriate "revising"/"stood down" message (reject/delegate).

**Flow F — Reset.**
A small "Reset demo" control (Home footer) clears `localStorage` and restores the 20-card seed state.

**Layout rules (hard):** one-handed reach — primary actions in the lower half; minimum tap target 44×44px; two surfaces only (D6); bottom sheets for all depth; no horizontal nav tabs.

---

## 8. Data model sketch (domain layer — architect refines)

```
Agent {
  id: 'backend' | 'marketing' | 'finance' | 'qa' | 'security'
  name: string
  status: { state: 'working' | 'waiting_approval' | 'blocked' | 'idle', message: string, updatedAt }
}

ApprovalRequest {
  id, agentId,
  title: string,
  summary: string,               // one line
  confidence: number,            // 0–100
  impact: string,                // e.g. "+$1,200 MRR", "affects 3,000 users"
  urgency: 'low' | 'medium' | 'high',
  risk: 'low' | 'medium' | 'high',      // drives "low-risk" bulk command
  recommendedAction: 'approve' | 'reject' | 'review',
  reasoning: string,             // for the Explain sheet
  details: string,               // for the Details sheet
  createdAt,
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'delayed',
  resolution?: { decidedAt, target?: agentId | 'tomorrow' }
}

Command  { raw: string, intent: 'approve_bulk_low_risk' | 'reject_match' | 'explain_agent'
                     | 'delay_tomorrow' | 'assign_agent' | 'unknown', args }

Domain services: ApprovalQueue (decide/delegate/bulk), CommandParser (raw → Command),
AgentEngine (spawns requests, transitions agent status after decisions).
Persistence: localStorage snapshot of queue + agent states; seed fixture of 20 cards.
```

Domain layer contains no React/browser APIs (D10). Everything else — components, styling, timers — is the architect's call.

---

## 9. Acceptance checklist (definition of done)

A QA agent verifies each item in a desktop browser (mouse events acceptable for gestures where noted; button fallbacks must always work with plain clicks). Start each item from a fresh "Reset demo" state unless stated.

1. **Inbox renders fully:** After reset, the Home surface shows "20 approvals waiting" and the Inbox lists 20 pending cards; the first card visibly displays all seven fields — title, summary, confidence as a percentage, estimated impact, urgency, requesting agent name, and recommended action — and five labeled buttons: Approve, Reject, Delegate, Why?, Details.
2. **Every action works by gesture AND by button:** (a) swipe/drag right approves a card and swipe/drag left rejects a card (pointer-drag on desktop counts), each removing it with a confirmation toast; (b) clicking Approve and Reject buttons does the same on two other cards; (c) long-press (≥500 ms pointer hold) and the Why? button each open the reasoning sheet; (d) double-click/double-tap and the Details button each open the details sheet; (e) swipe up and the Delegate button each open the delegate sheet. No decided card remains in the pending list.
3. **Delegate flow completes:** Opening Delegate on a card and choosing "QA" closes the sheet, shows a "Delegated to QA" confirmation, removes the card from the pending queue, and decrements the Home pending count by exactly 1; the delegate sheet also offers Backend, Marketing, Finance, Security, and "Tomorrow (delay)" options.
4. **Depth sheets are correct and non-destructive:** The reasoning sheet shows a non-empty plain-language rationale for that specific card, and the details sheet shows a non-empty full description plus the card's risk level; closing either sheet without deciding leaves the card pending and all counts unchanged; Approve/Reject inside a sheet resolves the card and closes the sheet.
5. **All five commands parse and execute:** Typing each of these into the command bar produces the stated effect and an on-screen confirmation — (a) `Approve all low-risk actions` approves every pending low-risk card and reports the count (pending low-risk count drops to 0); (b) `Reject marketing campaign` rejects a pending Marketing card whose text matches "campaign"; (c) `Ask Backend why this changed` opens the reasoning sheet for a pending Backend card; (d) `Delay until tomorrow` moves the current top card out of pending into a delayed state; (e) `Assign to QA` delegates the current top card to QA. A gibberish input (e.g. `frobnicate everything`) shows a help message listing the five supported commands and changes no counts.
6. **Widget summary stays accurate:** At all times during checks 2–5, the Home "approvals waiting" number equals the actual number of pending cards in the Inbox, and the "critical alert" count equals the number of pending high-urgency/high-risk cards; both update within 1 second of any decision, command, or newly generated request.
7. **Agent loop is visible end-to-end:** A new approval request appears from the mock engine without user action within 60 seconds of reset (pending count increments); after approving any card, that agent's Home status line changes to an in-progress/resumed message and then a completed message within ~5 seconds — demonstrating request → decision → resume on screen.
8. **Persistence, reset, and hygiene:** After deciding at least 3 cards, a full page reload preserves the reduced pending count and agent states (decided cards do not reappear); the "Reset demo" control restores exactly 20 pending cards; and no uncaught console errors appear on Home, Inbox, any bottom sheet, or during any of checks 1–7. Layout at 390×844 viewport shows the two surfaces with no horizontal scrolling and all action buttons at least 44×44 px.

---

*End of spec. Architect: choose stack details within D1–D3 and D10 (Vite + React + TypeScript recommended by the brief). QA: the checklist above is the team's definition of done.*
