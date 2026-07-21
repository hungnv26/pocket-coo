/**
 * Mock agent engine — PURE logic only (no timers here; the
 * infrastructure scheduler drives it). Decides WHAT happens; infra decides WHEN.
 *
 * Owned by: P1 (core logic).
 */
import type { AgentId, AgentStatus, ApprovalCard, AppState, Decision } from '../domain/types'
import {
  AGENT_IDS,
  AGENT_NAMES,
  MAX_PENDING,
  RESUME_COMPLETED_MS,
  RESUME_IN_PROGRESS_MS,
  SPAWN_INTERVAL_MS,
} from '../domain/types'

/** Random delay for the next spawned card, within [20s, 40s] (D8). */
export function nextSpawnDelayMs(random: () => number = Math.random): number {
  const [min, max] = SPAWN_INTERVAL_MS
  return min + Math.floor(random() * (max - min))
}

// ---------------------------------------------------------------------------
// Spawn templates — a rotating pool per agent so the demo stays varied.
// ---------------------------------------------------------------------------

type SpawnTemplate = Omit<ApprovalCard, 'id' | 'agentId' | 'createdAt' | 'status'>

const SPAWN_TEMPLATES: Record<AgentId, SpawnTemplate[]> = {
  backend: [
    {
      title: 'Restart stuck job queue worker',
      summary: 'Worker #3 has been idle for 20 minutes with 112 jobs queued.',
      confidence: 90,
      impact: '112 queued jobs resume',
      urgency: 'medium',
      risk: 'low',
      recommendedAction: 'approve',
      reasoning:
        'Worker #3 stopped heartbeating 20 minutes ago while the other workers are healthy, which matches the known stuck-connection pattern. A restart clears it in seconds and jobs are idempotent, so nothing is lost.',
      details:
        'Restarts the queue worker process on host worker-3. The 112 queued jobs (mostly email sends and webhook retries) will drain in about 4 minutes once the worker rejoins. No user-facing impact beyond the existing delay.',
    },
    {
      title: 'Enable response compression on the API',
      summary: 'Turn on gzip for JSON responses over 1 KB.',
      confidence: 86,
      impact: '−38% median payload size',
      urgency: 'low',
      risk: 'medium',
      recommendedAction: 'approve',
      reasoning:
        'Benchmarks on staging show a 38% median payload reduction with under 2ms of added CPU per request. The change is a single config flag and can be reverted instantly if any client misbehaves.',
      details:
        'Enables gzip compression at the load balancer for JSON responses larger than 1 KB. Mobile clients see the biggest win on slow connections. Rollout is config-only with immediate rollback available.',
    },
  ],
  marketing: [
    {
      title: 'Boost top-performing social post',
      summary: 'Put $150 behind this week’s best-performing post.',
      confidence: 82,
      impact: '+$150 ad spend',
      urgency: 'medium',
      risk: 'low',
      recommendedAction: 'approve',
      reasoning:
        'The post is already at 4x our median organic engagement, and boosting proven organic winners has historically returned 2–3x the spend in attributed signups. $150 is inside the pre-agreed experimentation budget.',
      details:
        'Applies a $150 boost over 5 days targeting lookalike audiences of current customers. Success metric is cost per signup under $8; the boost auto-stops at budget exhaustion.',
    },
    {
      title: 'Launch win-back email campaign',
      summary: 'Start a 2-email win-back campaign for churned trials.',
      confidence: 77,
      impact: '~600 churned trials reached',
      urgency: 'low',
      risk: 'medium',
      recommendedAction: 'review',
      reasoning:
        'Roughly 600 trials churned in the last 90 days without ever inviting a teammate — the segment most likely to reactivate. Win-back sends carry some list-fatigue risk, so the campaign is throttled and flagged for a quick review.',
      details:
        'Two emails, seven days apart, to trials that churned 30–90 days ago: a what’s-new digest and a 20%-off reactivation offer. Suppresses anyone who unsubscribed or reactivated. Expected reactivation rate 3–5% based on industry benchmarks.',
    },
  ],
  finance: [
    {
      title: 'Approve office supplies order',
      summary: 'Restock order from the usual vendor, within budget.',
      confidence: 96,
      impact: '−$240 cash',
      urgency: 'low',
      risk: 'low',
      recommendedAction: 'approve',
      reasoning:
        'The order matches the quarterly restock list, is $60 under the supplies budget line, and uses the vendor with net-30 terms we always use. Routine spend well inside policy.',
      details:
        'Standard quarterly restock: printer paper, notebooks, batteries, and coffee. Total $240 against a $300 budget line. Delivery in 3–5 business days to the office.',
    },
    {
      title: 'Flag unusual card transaction for review',
      summary: 'A $780 charge from a new vendor needs a human look.',
      confidence: 61,
      impact: '−$780 if legitimate',
      urgency: 'high',
      risk: 'high',
      recommendedAction: 'review',
      reasoning:
        'The charge is from a vendor never seen before, at 2:14 AM, and does not match any open purchase order. It could be a legitimate one-off tool purchase by a team member, but the pattern is close enough to card fraud that a human should confirm before it settles.',
      details:
        'Charge of $780 from "CLOUDTOOLS PRO LLC" on the ops corporate card, timestamped 2:14 AM. No matching PO or expense request. If not recognized, the recommended path is disputing the charge and rotating the card number.',
    },
  ],
  qa: [
    {
      title: 'Approve visual-diff baseline update',
      summary: 'Accept 14 intentional visual changes as new baselines.',
      confidence: 88,
      impact: '14 screens re-baselined',
      urgency: 'medium',
      risk: 'low',
      recommendedAction: 'approve',
      reasoning:
        'All 14 visual diffs trace to yesterday’s intentional button-style refresh — each was matched to a commit in the design-system changelog. Accepting them unblocks the visual regression gate for today’s merges.',
      details:
        'Updates the visual regression baselines for the 14 screens affected by the design-system button refresh. Every diff was reviewed side-by-side and tagged to the causing commit. Rejecting instead would block 3 open PRs on a stale baseline.',
    },
    {
      title: 'Extend browser test matrix to Safari',
      summary: 'Add Safari to the cross-browser e2e matrix.',
      confidence: 83,
      impact: '+12 min per CI run',
      urgency: 'low',
      risk: 'medium',
      recommendedAction: 'review',
      reasoning:
        'Safari is now 19% of production traffic but has zero automated coverage — two of the last five customer-reported bugs were Safari-only. The trade-off is 12 extra minutes per full CI run, which is why this is flagged for review rather than auto-applied.',
      details:
        'Adds Safari (via WebKit) to the nightly and pre-release e2e matrix — not to per-PR runs, keeping PR feedback fast. Initial run shows 3 currently-failing tests that would be triaged in the first week.',
    },
  ],
  security: [
    {
      title: 'Approve dependency security patch',
      summary: 'Patch a medium-severity CVE in the auth library.',
      confidence: 92,
      impact: '1 CVE closed, 4 services',
      urgency: 'high',
      risk: 'low',
      recommendedAction: 'approve',
      reasoning:
        'The CVE (CVSS 5.9) affects token validation under a narrow race condition. The patch release changes only the affected code path and our full auth test suite passes against it — a textbook safe patch worth applying promptly.',
      details:
        'Bumps the auth library one patch version across the 4 services that use it, then rolls them with the standard deploy pipeline. Total rollout about 15 minutes. No API or config changes involved.',
    },
    {
      title: 'Revoke unused OAuth app grants',
      summary: 'Remove 6 third-party app grants unused for 60+ days.',
      confidence: 89,
      impact: '6 integrations revoked',
      urgency: 'medium',
      risk: 'medium',
      recommendedAction: 'approve',
      reasoning:
        'Six third-party apps still hold read scopes on our workspace but have made zero API calls in 60+ days. Dormant grants are pure attack surface; any app someone still needs can be re-authorized in under a minute.',
      details:
        'Revokes OAuth grants for six inactive integrations (two analytics trials, one abandoned scheduling tool, three one-off importers). Affected team members get a notification listing the revoked apps and the one-click re-auth path.',
    },
  ],
}

/** Count previously spawned (non-seed) cards — drives template rotation. */
function spawnedCount(state: AppState): number {
  return state.cards.filter((c) => c.id.startsWith('card-gen-')).length
}

/**
 * Generate a new pending card, or null if the pending cap (30) is reached.
 * Deterministic rotation: agents take turns, and each agent rotates through
 * its template pool. `random` is accepted for API compatibility but the
 * rotation itself is deterministic so tests and demos are repeatable.
 */
export function spawnCard(state: AppState, now: number, _random: () => number = Math.random): ApprovalCard | null {
  const pending = state.cards.filter((c) => c.status === 'pending').length
  if (pending >= MAX_PENDING) return null

  const n = spawnedCount(state)
  const agentId = AGENT_IDS[n % AGENT_IDS.length]
  const pool = SPAWN_TEMPLATES[agentId]
  const template = pool[Math.floor(n / AGENT_IDS.length) % pool.length]

  return {
    ...template,
    id: `card-gen-${now}-${n}`,
    agentId,
    createdAt: now,
    status: 'pending',
  }
}

// ---------------------------------------------------------------------------
// Resume scripts (Flow E): what an agent's status line does after a decision.
// ---------------------------------------------------------------------------

function agentName(agentId: string): string {
  return AGENT_NAMES[agentId as AgentId] ?? agentId
}

/**
 * Status-line script an agent follows after a decision:
 * approve -> in-progress (~1.5s) then completed (~4.5s);
 * reject  -> revising then stood down;
 * delegate -> handing off then handed off;
 * delay ('tomorrow') -> stood down until tomorrow.
 * Offsets are relative to the decision; infra schedules the AGENT_STATUS
 * dispatches. Steps are always ordered by ascending afterMs.
 */
export function resumeScript(
  agentId: string,
  decision: Decision,
  now: number,
): Array<{ afterMs: number; status: AgentStatus }> {
  const name = agentName(agentId)
  const step = (afterMs: number, state: AgentStatus['state'], message: string) => ({
    afterMs,
    status: { state, message, updatedAt: now + afterMs },
  })

  switch (decision.kind) {
    case 'approve':
      return [
        step(RESUME_IN_PROGRESS_MS, 'working', 'Approved — executing now…'),
        step(RESUME_COMPLETED_MS, 'idle', 'Completed the approved action'),
      ]

    case 'reject':
      return [
        step(RESUME_IN_PROGRESS_MS, 'working', 'Request rejected — revising the plan…'),
        step(RESUME_COMPLETED_MS, 'idle', 'Stood down; revised plan ready'),
      ]

    case 'delegate': {
      if (decision.target === 'tomorrow') {
        return [step(RESUME_IN_PROGRESS_MS, 'idle', 'Stood down until tomorrow')]
      }
      const target = agentName(decision.target)
      return [
        step(RESUME_IN_PROGRESS_MS, 'working', `Handing off to ${target}…`),
        step(RESUME_COMPLETED_MS, 'idle', `Handed off to ${target}`),
      ]
    }
  }
  // Unreachable for well-typed decisions; keeps the function total for JS callers.
  return [step(RESUME_IN_PROGRESS_MS, 'idle', `${name} resumed`)]
}
