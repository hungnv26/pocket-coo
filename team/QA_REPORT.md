PASS

# Pocket COO — QA Report

- **Date:** 2026-07-21 (initial pass + re-test of fix `83218a7`)
- **Build under test:** main at `83218a7` ("[P2] Fix dead sheet Close button: skip pointer capture from buttons"), dev server `pnpm dev` on :5173 (fix confirmed active in the served bundle)
- **Environment:** Chromium via browser tooling, viewport 390×844 (mobile width) throughout
- **`pnpm test`:** PASS — 7 files, 81 tests, 0 failures
- **`pnpm build`:** PASS — tsc + vite build clean (234.93 kB JS / 10.04 kB CSS)
- **Console:** zero uncaught errors or warnings across the entire session (Home, Inbox, all sheets, commands, reload, reset)

Every gesture was exercised with real pointer input (CDP drags/clicks/double-click); the long-press was additionally exercised with a scripted pointerdown→hold→pointerup sequence. Every gesture's labeled button fallback was clicked for real. All five spec commands were typed verbatim into the command bar and submitted via the Send button (synthetic-Enter quirk noted by integration; not counted as a bug).

## Checklist results (SPEC §9)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | Inbox renders fully: 20 cards, 7 fields, 5 buttons | ✅ | After Reset: Home "20 approvals waiting"; Inbox badge 20; DOM has exactly 20 `<article>` cards. First card (Backend "Deploy API v2.1 to production") shows title, summary, confidence "92%", impact "affects 3,000 users", urgency "High", agent chip "Backend", "Recommended: Approve", plus Approve / Reject / Delegate / Why? / Details buttons. |
| 2 | Every action by gesture AND button | ✅ | (a) drag right approved "Deploy API v2.1…" (toast "Approved: Deploy API v2.1 to production"); drag left rejected "Launch spring email campaign" — both removed from list. (b) Approve button approved "Pay contractor invoice #1042"; Reject button rejected "Quarantine flaky checkout test suite" (states verified in localStorage: `approved`/`rejected`). (c) 700 ms pointer hold opened the reasoning sheet; Why? button opened it too. (d) real double-click opened the Details sheet; Details button opened it too. (e) drag up 200 px opened the delegate sheet; Delegate button opened it too. No decided card remained pending. |
| 3 | Delegate flow completes | ✅ | Delegate sheet lists Backend, Marketing, Finance, QA, Security, "Tomorrow (delay)". Choosing QA closed the sheet, card → `delegated` with `resolution.target: "qa"`, pending 30 → 29 (exactly −1, badge and state in sync). Confirmation shown ("Delegated to QA: …" verified; "Delayed until tomorrow: Scale database read replicas 2 → 3" toast captured within 300 ms for the Tomorrow target). |
| 4 | Depth sheets correct and non-destructive | ✅ | Content: reasoning sheet shows the card-specific plain-language rationale; details sheet shows the full description + risk level ("Risk medium") + urgency/confidence/impact. Backdrop tap and swipe-down (≥80 px on header) both close without deciding, card stays pending, counts unchanged. In-sheet Reject on "Ship release despite 2 minor known bugs" resolved the card and closed the sheet. The Close button initially failed real pointer clicks (former Bug 1, now RESOLVED — see below); after fix `83218a7`, real Close clicks were re-verified on all three sheets. |
| 5 | All five commands parse and execute | ✅ | (a) "Approve all low-risk actions" → "Approved 16 low-risk actions", pending low-risk 16 → 0. (b) "Reject marketing campaign" → "Rejected 2 requests matching Marketing \"campaign\"", 0 matching cards remain pending. (c) "Ask Backend why this changed" → reasoning sheet opened for Backend "Enable response compression on the API". (d) "Delay until tomorrow" → top card "Switch payroll provider to Gusto" → `delayed`, target "tomorrow"; Home shows "2 requests delayed until tomorrow". (e) "Assign to QA" → "Delegated to QA: Block traffic from flagged IP range", card `delegated` → qa. Gibberish "frobnicate everything" → "Didn't understand that command." toast + inline help block listing all five commands; no counts changed. Each recognized command showed both a toast and persistent inline feedback. |
| 6 | Widget summary stays accurate | ✅ | Sampled repeatedly during checks 2–5: Home "approvals waiting" always equaled state/DOM pending count (e.g. 15 = 15 = 15); "critical alerts" equaled pending cards with high risk OR high urgency (2 = 2). Updates were immediate (<1 s) after decisions, commands, and spawns; inbox badge tracked identically. |
| 7 | Agent loop visible end-to-end | ✅ | Engine spawned cards without user action at measured gaps of 20–38 s (11 spawns logged; well under the 60 s bound; pending capped at 30 as designed). After approving a Backend card, Home status line transitioned: → "Approved — executing now… (Working)" at ~2.1 s → "Completed the approved action (Idle)" at ~4.9 s. Request → decide → resume fully visible. |
| 8 | Persistence, reset, hygiene | ✅ | After 8+ decisions, full reload preserved 15 pending / 29 decided (no decided card reappeared) and agent status messages. "Reset demo" restored exactly 20 pending cards. No console errors anywhere. At 390×844: `scrollWidth` 390 = viewport (no horizontal scroll); all five card buttons 103×44 px, Send 71×48 px, sheet Close 75×44 px — every tap target ≥44 px. |

## Resolved bugs

### Bug 1 — Sheet "Close" button did not respond to real clicks (RESOLVED in `83218a7`)

**Resolution:** P2 engineer added a guard at the top of the grip-area pointerdown handler (`src/presentation/BottomSheetHost.tsx:36`): `if ((e.target as HTMLElement).closest('button')) return` — pointer capture is now skipped when the press originates on a button, exactly the fix suggested below.

**Re-test evidence (fresh reset, fix confirmed active in the served source):**
- Reasoning sheet (Why?): real Close click dismissed the sheet; card stayed pending, top card unchanged.
- Details sheet: real Close click dismissed the sheet; no decision recorded.
- Delegate sheet: real Close click dismissed the sheet; zero cards decided across all three closes (state check: 0 non-pending seed cards).
- Regressions: swipe-down on the grip (192 px drag) still dismisses; backdrop tap still dismisses; in-sheet Approve (real click) on "Deploy API v2.1 to production" still resolved the card (`approved`) and closed the sheet.
- Console: zero errors during the entire re-test.

**Original report (for the record):**

- **Checklist item:** §9.4 (also SPEC §7 Flow B "Dismiss sheet by button or swipe-down" and D4's button-fallback rule). Affects all three sheets (reasoning, details, delegate).
- **Repro:**
  1. Reset demo, open the Inbox.
  2. Tap "Why?" (or Details, or Delegate) on any card — the bottom sheet opens.
  3. Click the "Close" button in the sheet header with the mouse (or tap on touch).
- **Expected:** sheet closes, card remains pending.
- **Actual:** nothing happens; the sheet stays open. Reproduced on a fresh page load, multiple times, via both coordinate and element-targeted clicks.
- **Root cause (verified with event logging):** `src/presentation/BottomSheetHost.tsx` (pre-fix line 34) — `onGripPointerDown` unconditionally called `e.currentTarget.setPointerCapture(e.pointerId)` on `.sheet-grip-area`, and the Close button is *inside* that grip/header area (lines 81–86). Pointer capture retargets the subsequent `pointerup`/`mouseup` to the grip area, so the browser fires `click` on `.sheet-grip-area` (the common ancestor), never on the button. Captured sequence: `pointerdown@sheet-close → pointerup@sheet-grip-area → click@sheet-grip-area`. The button's `onClick` only fires for synthetic `element.click()` or keyboard activation, which is why unit/dev testing missed it.
- **Console errors:** none.
- **Workarounds that do work:** backdrop tap, swipe-down on the header, in-sheet Approve/Reject, keyboard Enter on the focused button.
- **Suggested fix (one line):** in `onGripPointerDown`, bail out (no capture, no drag start) when the press originates on an interactive child, e.g. `if ((e.target as Element).closest('button')) return`.
- **Owning package:** P2 (Presentation — `BottomSheetHost.tsx`).

## Non-blocking / cosmetic observations

1. **Spawned card titles repeat in long sessions.** After ~10 minutes at the 30-card cap, two pending Marketing cards had the identical title "Launch win-back email campaign" (template pool wrap-around). Deterministic and harmless for the 5-minute demo, but looks odd side by side. (P1 `agentEngine.ts` template pools.)
2. **Mid-word wrap in metric boxes.** At 390 px, the impact value "affects 12 legacy integrations" breaks mid-word ("integration / s") inside the IMPACT box. Suggest `overflow-wrap: normal` / `hyphens` tuning on `.metric` values. (P2 `index.css`.)
3. **Synthetic Enter keypress doesn't submit the command form** in automation tooling; the Send button works, and this is a known tooling quirk of synthetic key events, not a product bug. Real-keyboard Enter path was not disprovable from tooling; recommend a 10-second manual sanity check.
4. Command confirmations render as both a 3 s toast and persistent inline feedback — matches DECISIONS.md P3.1; noted here so nobody reports the "double message" as a bug.

## Mobile-width verdict (375–390 px)

Entire session ran at 390×844: no horizontal scroll, two surfaces only, sheets and command bar within one-handed reach, all tap targets ≥44 px. Nothing broken at mobile width.
