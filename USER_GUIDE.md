# Pocket COO — User Guide

Pocket COO turns your phone into your company's decision desk. Your AI agents do the work; you make the calls. This guide covers everything you can do in the app.

---

## 1. Opening the app

- **On your iPhone:** tap the **Pocket COO** icon (already installed). It works fully offline.
- **On your Mac:** `cd ~/builds/pocket-coo && pnpm dev`, then open http://localhost:5173 — same app, in a phone-sized frame.

Your decisions are saved on the device automatically. Nothing you do is sent anywhere.

## 2. The Home screen — your morning glance

Home shows only what needs you:

- **Big blue number** — approvals waiting. Tap the card (or **Review ›**) to open the Inbox.
- **Red line** — critical alerts: pending requests that are high-risk or high-urgency.
- **Delayed line** — anything you postponed until tomorrow.
- **AGENTS list** — one row per agent with a live status: 🟡 *Waiting for approval*, 🔵 *Working*, ⚪ *Idle*. Watch these change in real time after your decisions.
- **Reset demo** (bottom) — wipes everything back to the fresh 20-request starting state. Use it any time you want a clean run.

## 3. The Inbox — reading a card

Each card is one decision. Top to bottom:

| Field | What it tells you |
|---|---|
| **Agent chip** | Who is asking (Backend, Marketing, Finance, QA, Security) |
| **Risk badge** | Low / Medium / High — how safe the action is |
| **Title + summary** | What the agent wants to do, in one breath |
| **Confidence** | How sure the agent is (e.g. 95%) |
| **Impact** | What it costs or earns (e.g. "+$1,200 MRR est.", "−$3,400 cash") |
| **Urgency** | How soon it matters |
| **Recommended** | The agent's own suggestion |

Cards are ordered oldest-first — the top card is always the one that has waited longest.

## 4. Making decisions — gestures and buttons

Every gesture has a button doing exactly the same thing, so use whichever is comfortable:

| Action | Gesture | Button |
|---|---|---|
| **Approve** | Swipe the card **right** | `Approve` |
| **Reject** | Swipe the card **left** | `Reject` |
| **Delegate / delay** | Swipe the card **up** | `Delegate` |
| **See the agent's reasoning** | **Long-press** the card (½ second) | `Why?` |
| **See full details** | **Double-tap** the card | `Details` |

Tips:

- While dragging you'll see an overlay hint (Approve / Reject / Delegate) — release past the threshold to commit, or let go early to cancel.
- A small toast confirms every decision. There is **no undo** in this version, so swipe with intent.
- After you decide, watch the Home screen: the agent goes *Working* within ~2 seconds and finishes a few seconds later — that's the loop closing.

## 5. The bottom sheets

- **Why? (Reasoning)** — the agent explains its thinking. You can Approve or Reject right from the sheet.
- **Details** — the full request: facts, figures, timestamps, risk. Also has Approve/Reject.
- **Delegate** — pick who takes it over: any of the five agents, or **Tomorrow (delay)** to push it off your plate until tomorrow.

Close any sheet with the **Close** button, a **swipe-down** on the sheet header, or a tap on the dark backdrop — the card stays pending, nothing is decided.

## 6. The command bar — decide by "voice"

The text bar at the bottom of the Inbox accepts natural commands (type them for now; actual speech input is a planned upgrade). The five things it understands:

| Say / type | What happens |
|---|---|
| **"Approve all low-risk actions"** | Every pending low-risk request is approved at once — the fastest way to clear routine work |
| **"Reject marketing campaign"** | Rejects the pending Marketing request(s) matching "campaign" |
| **"Ask Backend why this changed"** | Opens the reasoning sheet for Backend's latest request |
| **"Delay until tomorrow"** | Postpones the top card until tomorrow |
| **"Assign to QA"** | Delegates the top card to the QA agent |

Phrasing is forgiving ("approve all low risk", "hand off to backend", "postpone until tomorrow" all work). Anything it doesn't understand shows the five examples as help — tap an example to prefill it. Every command answers with a confirmation telling you exactly what it did ("Approved 10 low-risk actions").

## 7. The five-minute routine

This is the workflow the app is built around:

1. Open the app → Home tells you how many decisions are waiting and whether anything is critical.
2. Tap **Review ›**.
3. Type **"Approve all low-risk actions"** — routine work is gone in one command.
4. Swipe through what remains: right for yes, left for no. Long-press anything you're unsure about and read the reasoning.
5. **Delegate** anything that needs a specialist, or **"Delay until tomorrow"** what can wait.
6. Back on Home, watch your agents go back to work. Done — pocket your phone.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Queue looks stale or overgrown | Tap **Reset demo** on Home for a fresh 20-card start |
| App icon stops launching after ~a week (iPhone) | Free Apple developer provisioning expires every 7 days — reinstall: open `ios/PocketCOO.xcodeproj` in Xcode, select your iPhone, press Run (or ask Claude to reinstall) |
| "Untrusted Developer" alert | Settings → General → VPN & Device Management → trust the developer profile (one time) |
| Web version won't start on :5173 | Another process holds the port — stop it; the dev server refuses to drift ports on purpose |

## 9. Good to know

- **New requests keep arriving** every 20–40 seconds (the queue caps at 30) — the demo stays alive as long as you keep it open.
- **Critical** means high risk *or* high urgency; the red count on Home tracks it exactly.
- Everything is local and mock: no real deployments, payments, or emails happen. It's a safe place to feel out the decision workflow.
