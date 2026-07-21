# Pocket COO — Build Report

**Date:** 21 July 2026
**Location:** `/Users/macs/builds/pocket-coo` (local git repository, branch `main`)
**Status:** ✅ Delivered — QA passed, running on the web, in the iOS Simulator, and installed on your iPhone 17 Pro Max

---

## 1. Executive summary

Pocket COO is a mobile-first **AI-agent approval inbox**: five mock cloud agents (Backend, Marketing, Finance, QA, Security) continuously request decisions, and the owner triages them from a phone with one-swipe approve/reject, one-tap depth, and bulk text commands. The phone is a command surface, not a workstation — every screen answers one question: *"What requires my decision?"*

The MVP was built in one session by a multi-agent pipeline (PM → Architect → two parallel Engineers → Integration Engineer → QA → Tech Writer), passed the full 8-item acceptance checklist, and was then wrapped in a native SwiftUI shell, code-signed, and installed on a physical iPhone.

**Success metric met:** review 20 approvals (approve 15, reject 3, delegate 2) with full understanding in under five minutes — verified by QA in the running app.

## 2. What was built

| Feature | Detail |
|---|---|
| **Approval Inbox** | Card stack; each card shows title, summary, confidence %, estimated impact, urgency, requesting agent, recommended action, and a risk badge (low/medium/high) |
| **Gestures** | Swipe right = approve, swipe left = reject, swipe up = delegate, long-press = explain reasoning, double-tap = details — every gesture also has a large labeled button |
| **Bottom sheets** | Details, Reasoning ("Why?"), and Delegate picker (five agents + "Tomorrow (delay)"); dismiss by Close button, swipe-down, or backdrop tap; in-sheet Approve/Reject |
| **Command bar** | Text commands ("voice" for MVP) parsing five shapes, including bulk **"Approve all low-risk actions"** |
| **Home widget surface** | "N approvals waiting", critical-alert count, delayed count, live per-agent status lines — only actionable information |
| **Live agent loop** | Agents spawn new requests every 20–40 s (queue capped at 30) and visibly resume work ~1.5–5 s after each decision |
| **Persistence** | Decisions survive reload (localStorage); "Reset demo" restores the deterministic 20-card seed |

## 3. Architecture

Four layers, dependency arrows pointing downward only:

```
Presentation   React components, gestures, sheets, styling
Application    Command parser, command executor, agent engine   (pure TS)
Domain         Types, reducer, selectors, seed data             (pure TS)
Infrastructure localStorage adapter, timer scheduler
```

`domain` and `application` contain **no React and no browser APIs** (verified by grep and enforced in review), so the business rules are platform-independent — a future fully native iOS/Android client can reuse the same contracts. Stack: Vite + React + TypeScript, plain CSS, no backend, no extra libraries (gestures are raw pointer events).

## 4. How it was built — the team pipeline

1. **PM** wrote a decisive spec (`team/SPEC.md`): 13 locked decisions, 8 machine-checkable acceptance items.
2. **Architect** wrote the plan (`team/PLAN.md`), chose the stack, froze the TypeScript contracts, and scaffolded the repo.
3. **Two engineers in parallel** (isolated git worktrees): P1 built the pure logic layers with 81 unit tests; P2 built the entire UI props-driven against the frozen contracts. Their file sets were disjoint by design — the merge had one trivial conflict (a shared log file).
4. **Integration engineer** (P3) wired store ↔ UI, persistence, and timers, and caught a real bug in self-review: a CSS sticky/overflow interaction had pushed the command bar ~9,400 px off-screen. Fixed before QA.
5. **QA** independently walked all 8 acceptance items in the browser and found **one blocking bug**: the bottom-sheet Close button was dead because pointer capture on the sheet grip swallowed its clicks. Routed back to the owning engineer, fixed with a one-line guard, re-verified → **PASS**.
6. **Tech writer** produced `README.md` and `team/DELIVERY.md`.

Full paper trail: `team/SPEC.md`, `team/PLAN.md`, `team/DECISIONS.md`, `team/QA_REPORT.md`, `team/DELIVERY.md`.

## 5. Quality snapshot

- **Unit tests:** 81/81 passing (`pnpm test`) — reducer, selectors, seed invariants, parser, executor, agent engine, end-to-end loop
- **QA acceptance:** 8/8 items PASS (independent agent, real browser, 390×844, zero console errors)
- **Build:** clean; ~75 KB gzipped JS
- **Accessibility floor:** ≥44 px tap targets, `aria-live` toasts, every gesture mirrored by a button

## 6. iOS delivery

- `ios/` contains a SwiftUI + WKWebView shell (XcodeGen project).
- **Key technical finding:** WKWebView refuses to execute ES-module scripts over `file://` (null origin + CORS), so the app bundle is served through a custom `pococo://` URL-scheme handler with correct MIME types — the same pattern Capacitor uses. This also gives the app a stable origin, so localStorage persistence works on-device.
- Signed automatically with your personal team (`Y9T5MPV87F`, hungnv26@gmail.com) and installed on **iPhone 17 Pro Max ("iP17PM-Noza")** via `devicectl`. The app runs fully offline — everything ships inside the bundle.
- ⚠️ Free personal-team provisioning **expires after 7 days**; reinstall from Xcode (Run) or ask Claude to redo the install.

## 7. Known limitations (intentional MVP cuts)

- No undo (a toast confirms each decision instead)
- "Voice" is a text command bar; Web Speech API is a documented next step
- Mock agents only — no real backend, auth, or push notifications
- Cosmetic: duplicate spawned-card titles in very long sessions; mid-word wrap in one metric box at 390 px

## 8. Future improvements

Web Speech API voice input · real agent backend with push notifications · undo window · native SwiftUI client reusing the domain/application layers · lock-screen widgets · audit trail of decisions.
