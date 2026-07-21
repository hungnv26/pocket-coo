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
