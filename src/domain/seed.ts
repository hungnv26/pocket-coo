/**
 * Seed fixture: exactly 20 pending cards (D8) across all 5 agents and all 3
 * risk levels, plus initial agent statuses. Deterministic (fixed content) so
 * QA checks are repeatable. Pure TS.
 *
 * Invariants (tested in seed.test.ts):
 * - exactly SEED_CARD_COUNT (20) pending cards, unique ids
 * - every agent has >= 2 cards; all three risk levels represented
 * - >= 2 Marketing cards whose title/summary contains "campaign"
 * - >= 1 pending Backend card
 * - non-empty reasoning and details on every card
 * - createdAt strictly increasing with array index (index 0 = oldest = inbox top)
 *
 * Owned by: P1 (core logic).
 */
import type { AgentStatus, ApprovalCard, AppState, AgentId } from './types'
import { AGENT_IDS, AGENT_NAMES, SEED_CARD_COUNT } from './types'

type SeedCard = Omit<ApprovalCard, 'id' | 'createdAt' | 'status'> & { slug: string }

/** Authored oldest-first; createdAt is spread one minute apart ending just before `now`. */
const SEED_CARDS: SeedCard[] = [
  {
    slug: 'card-backend-1',
    agentId: 'backend',
    title: 'Deploy API v2.1 to production',
    summary: 'Ship the v2.1 release with the new billing endpoints.',
    confidence: 92,
    impact: 'affects 3,000 users',
    urgency: 'high',
    risk: 'medium',
    recommendedAction: 'approve',
    reasoning:
      'All 412 integration tests pass and the release has been running clean on staging for 48 hours. The billing endpoints are behind a feature flag, so rollback is a one-click flag flip rather than a redeploy.',
    details:
      'Release v2.1 bundles the new usage-based billing endpoints, three dependency upgrades, and a fix for the webhook retry bug. Deployment uses the standard blue-green pipeline with automatic health checks; estimated rollout time is 12 minutes with zero expected downtime.',
  },
  {
    slug: 'card-marketing-1',
    agentId: 'marketing',
    title: 'Launch spring email campaign',
    summary: 'Send the 3-part spring promo campaign to the full list.',
    confidence: 85,
    impact: '+$1,200 MRR est.',
    urgency: 'medium',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'The campaign copy A/B-tested at a 4.1% click rate against last quarter’s 2.8% baseline, and the send is throttled over three days to protect sender reputation. Unsubscribe risk is low because the list was cleaned last month.',
    details:
      'Three emails over ten days to 18,400 subscribers: an announcement, a case-study follow-up, and a closing discount reminder. Projected 40 trial signups at the historical 8% trial-to-paid rate gives roughly +$1,200 MRR. All copy and links are staged in the ESP and ready to schedule.',
  },
  {
    slug: 'card-finance-1',
    agentId: 'finance',
    title: 'Pay contractor invoice #1042',
    summary: 'Release payment for the March design contract work.',
    confidence: 95,
    impact: '−$3,400 cash',
    urgency: 'high',
    risk: 'medium',
    recommendedAction: 'approve',
    reasoning:
      'The invoice matches the signed statement of work line-for-line and the deliverables were accepted on March 28. Paying today keeps us inside the net-15 terms and avoids the 2% late fee that starts accruing Friday.',
    details:
      'Invoice #1042 from Studio Norte covers 34 hours of product design at the contracted $100/hr. Deliverables (onboarding redesign, 12 screens) were reviewed and accepted. Payment goes via the usual ACH rail; cash balance after payment remains above the $25k floor.',
  },
  {
    slug: 'card-qa-1',
    agentId: 'qa',
    title: 'Quarantine flaky checkout test suite',
    summary: 'Move 6 flaky checkout tests out of the blocking CI path.',
    confidence: 87,
    impact: 'unblocks 4 open PRs',
    urgency: 'medium',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'These six tests failed intermittently in 31% of the last 100 CI runs with no correlated product bug — the failures trace to a shared fixture race, not checkout itself. Quarantining them restores a trustworthy signal while the fixture is rewritten.',
    details:
      'The tests move to a non-blocking nightly job with alerting, so coverage is retained but merges stop being blocked. A tracked ticket (QA-218) covers rewriting the shared cart fixture; the quarantine auto-expires in 14 days and the suite returns to the blocking path.',
  },
  {
    slug: 'card-security-1',
    agentId: 'security',
    title: 'Force password reset for 14 stale admin accounts',
    summary: 'Expire credentials on admin accounts inactive for 90+ days.',
    confidence: 91,
    impact: 'affects 14 internal users',
    urgency: 'high',
    risk: 'medium',
    recommendedAction: 'approve',
    reasoning:
      'Fourteen admin accounts have not logged in for over 90 days, and stale privileged credentials are the single most common entry point in breach post-mortems. A forced reset is low-friction: each user just re-authenticates on next login.',
    details:
      'Affected accounts get their sessions revoked and a reset email immediately; none belong to on-call staff, so there is no operational risk tonight. The action is logged to the audit trail and a summary is posted to #security. Accounts still unused after 30 more days will be flagged for removal.',
  },
  {
    slug: 'card-backend-2',
    agentId: 'backend',
    title: 'Scale database read replicas 2 → 3',
    summary: 'Add a third read replica to absorb the reporting load.',
    confidence: 88,
    impact: '+$140/mo infra cost',
    urgency: 'medium',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'Read latency p95 has climbed from 80ms to 210ms over two weeks, driven by the new reporting queries. A third replica brings projected p95 back under 100ms and is fully reversible — we can drop back to two replicas at any time.',
    details:
      'Provisions one additional db.r6g.large read replica in the same region and adds it to the read pool. Cost is $140/month. The change is applied via Terraform with no write-path impact and roughly 8 minutes until the replica is in rotation.',
  },
  {
    slug: 'card-marketing-2',
    agentId: 'marketing',
    title: 'Double budget on retargeting campaign',
    summary: 'Raise the retargeting campaign spend from $2k to $4k/mo.',
    confidence: 63,
    impact: '+$2,000/mo ad spend',
    urgency: 'medium',
    risk: 'high',
    recommendedAction: 'review',
    reasoning:
      'The campaign’s ROAS is 3.1 at current spend, but retargeting audiences saturate quickly and the incremental return above $3k/month is unproven. Recommending human review because doubling spend could halve efficiency rather than double results.',
    details:
      'Current retargeting campaign spends $2,000/month returning ~$6,200 in attributed revenue. The proposal doubles daily budgets across both ad platforms for 30 days with a checkpoint at day 14; if blended ROAS drops below 2.0 the budget automatically reverts.',
  },
  {
    slug: 'card-qa-2',
    agentId: 'qa',
    title: 'Ship release despite 2 minor known bugs',
    summary: 'Approve Friday’s release with two cosmetic bugs open.',
    confidence: 66,
    impact: 'affects <1% of sessions',
    urgency: 'high',
    risk: 'high',
    recommendedAction: 'review',
    reasoning:
      'Both open bugs are cosmetic (a tooltip clipping issue and a mis-aligned empty state on tablet) and reproduce in under 1% of sessions. Holding the release would also delay the security patch bundled with it — but shipping with known defects is a judgment call, so this is flagged for review.',
    details:
      'Release 24.14 contains 9 fixes including one security patch. Known open issues: BUG-1121 (tooltip clipping on narrow screens) and BUG-1128 (empty-state misalignment on tablet portrait). Both have fixes scheduled for the next sprint; neither affects data integrity or checkout.',
  },
  {
    slug: 'card-finance-2',
    agentId: 'finance',
    title: 'Switch payroll provider to Gusto',
    summary: 'Migrate payroll off the current provider at renewal.',
    confidence: 58,
    impact: 'saves $210/mo',
    urgency: 'low',
    risk: 'high',
    recommendedAction: 'review',
    reasoning:
      'The switch saves $2,520/year and adds contractor auto-filing, but payroll migrations carry real failure modes — a missed cycle or bad tax filing costs far more than the savings. Confidence is moderate because two integrations have no direct equivalent, so this needs owner review.',
    details:
      'Current provider renews June 1 at $410/month; Gusto quotes $200/month for the same headcount. Migration window would be the last week of May with parallel runs for one cycle. Open questions: 401(k) sync support and the state tax registration transfer for two remote employees.',
  },
  {
    slug: 'card-security-2',
    agentId: 'security',
    title: 'Block traffic from flagged IP range',
    summary: 'Add a WAF block for a range showing credential-stuffing.',
    confidence: 84,
    impact: 'blocks ~2% of bot traffic',
    urgency: 'high',
    risk: 'high',
    recommendedAction: 'review',
    reasoning:
      'The range generated 40,000 failed logins in six hours — a clear credential-stuffing pattern. It is flagged high-risk because the block is a /16: broad enough that a small number of legitimate users on the same hosting provider could be caught, so review is recommended before enforcing.',
    details:
      'Adds a WAF deny rule for 185.220.0.0/16 for 72 hours with automatic expiry. Telemetry shows 98.7% of requests from this range in the last 24h were failed authentication attempts. Legitimate-looking traffic from the range is ~110 requests/day; affected users would see a challenge page with a support link.',
  },
  {
    slug: 'card-marketing-3',
    agentId: 'marketing',
    title: 'Publish April newsletter',
    summary: 'Send the April product-update newsletter to subscribers.',
    confidence: 90,
    impact: '18,000 subscribers',
    urgency: 'low',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'The newsletter follows the exact format of the last six sends, all of which held open rates above 38% with unsubscribe rates under 0.2%. Content is product updates only — no offers or claims that would need legal review.',
    details:
      'Covers the three April feature releases, one customer story, and the changelog digest. Copy is proofread and staged in the ESP; links are UTM-tagged. Scheduled send is Tuesday 9:00 AM in each subscriber’s local timezone.',
  },
  {
    slug: 'card-backend-3',
    agentId: 'backend',
    title: 'Rotate production API keys',
    summary: 'Perform the quarterly rotation of external API keys.',
    confidence: 97,
    impact: '~5 min of degraded API access',
    urgency: 'low',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'This is the standard quarterly rotation, fully scripted and rehearsed — the last three rotations completed without incident. Keys are dual-published during the switch, so the only impact is a brief window where cached clients may retry once.',
    details:
      'Rotates the six external-facing API keys using the overlap strategy: new keys are published, clients migrate for 24 hours, then old keys are revoked. The runbook includes verification checks after each step and an immediate re-issue path if any partner reports failures.',
  },
  {
    slug: 'card-qa-3',
    agentId: 'qa',
    title: 'Add nightly regression run',
    summary: 'Schedule the full regression suite to run every night.',
    confidence: 93,
    impact: '+35 min CI time/night',
    urgency: 'low',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'Full regression currently only runs before releases, which lets defects hide for up to two weeks. A nightly run surfaces breakage within 24 hours at the cost of 35 minutes of off-peak CI time — well inside the current CI budget.',
    details:
      'Adds a scheduled 2:00 AM pipeline running the full 1,800-test regression suite against the staging build. Failures page nobody: they post a morning summary to #qa with flake-detection applied. Estimated cost is $11/month in runner minutes.',
  },
  {
    slug: 'card-finance-3',
    agentId: 'finance',
    title: 'Renew SaaS subscriptions bundle',
    summary: 'Renew the annual tooling bundle at the negotiated rate.',
    confidence: 89,
    impact: '−$780/yr vs. last year',
    urgency: 'medium',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'The vendor accepted our consolidation ask, so renewing the three tools as a bundle comes in $780/year cheaper than last year’s separate renewals. Letting the deadline pass reverts pricing to list, which is 18% higher.',
    details:
      'Bundle covers the error-tracking, log-management, and uptime-monitoring subscriptions for 12 months at $4,020 total. All three tools show weekly active use by the team. The negotiated quote expires at the end of the month; payment goes on the corporate card as usual.',
  },
  {
    slug: 'card-security-3',
    agentId: 'security',
    title: 'Enable 2FA requirement for contractors',
    summary: 'Require two-factor auth on all contractor accounts.',
    confidence: 96,
    impact: 'affects 9 contractors',
    urgency: 'medium',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'Employees have had mandatory 2FA since January; contractors were the documented exception and are now the weakest link on accounts with repo access. All nine contractors already use authenticator apps elsewhere, so enrollment friction is minimal.',
    details:
      'Flips the org-level policy to require 2FA for the contractor group. Each contractor gets an email with setup instructions and a 7-day grace period; accounts not enrolled by then are suspended until enrollment. Support has a one-page FAQ ready.',
  },
  {
    slug: 'card-backend-4',
    agentId: 'backend',
    title: 'Drop legacy /v1/orders endpoint',
    summary: 'Remove the deprecated v1 orders API from production.',
    confidence: 74,
    impact: 'affects 12 legacy integrations',
    urgency: 'low',
    risk: 'high',
    recommendedAction: 'review',
    reasoning:
      'The endpoint was deprecated nine months ago and traffic is down 97%, but twelve integrations still call it occasionally and two of them belong to paying customers we cannot identify a contact for. Removal is flagged for review because breaking a paying customer silently is worse than carrying the endpoint another quarter.',
    details:
      'Traffic to /v1/orders is now 210 requests/day, down from 7,000. The removal plan: return sunset headers for 30 days, then 410 Gone with a migration link. The two unidentified callers average 40 requests/day; support has drafted an outreach email if approve is chosen.',
  },
  {
    slug: 'card-marketing-4',
    agentId: 'marketing',
    title: 'A/B test new landing-page headline',
    summary: 'Run a 50/50 headline test on the main landing page.',
    confidence: 81,
    impact: '~9,000 visitors/wk in test',
    urgency: 'low',
    risk: 'medium',
    recommendedAction: 'approve',
    reasoning:
      'The current headline has held since launch and benchmark data suggests outcome-focused headlines lift conversion 10–20% in our category. The test is fully reversible and auto-concludes at statistical significance, so downside is bounded to the test period.',
    details:
      'Variant headline leads with the time-saved outcome instead of the feature list. Split runs 50/50 on all organic and paid landing traffic (~9,000 visitors/week) for a maximum of three weeks, with signup conversion as the primary metric. The experiment auto-stops early if either variant drops conversion by more than 15%.',
  },
  {
    slug: 'card-finance-4',
    agentId: 'finance',
    title: 'Write off aged receivable ($920)',
    summary: 'Write off an invoice unpaid for 180+ days as bad debt.',
    confidence: 76,
    impact: '−$920 one-time',
    urgency: 'low',
    risk: 'medium',
    recommendedAction: 'review',
    reasoning:
      'The customer churned in October, has not responded to five collection attempts, and the amount is below the threshold where collections agencies take the case. Writing it off cleans the books before quarter close, but forgiving revenue is an owner-level call, so it is flagged for review.',
    details:
      'Invoice #0871 for $920, issued last September to a customer who cancelled in October. Collection attempts: three emails, one call, one final notice — all unanswered. The write-off posts to bad-debt expense this quarter and the customer account is flagged to require prepayment if they ever return.',
  },
  {
    slug: 'card-qa-4',
    agentId: 'qa',
    title: 'Bump Playwright to v2',
    summary: 'Upgrade the end-to-end test framework to the next major.',
    confidence: 79,
    impact: 'touches 210 e2e tests',
    urgency: 'low',
    risk: 'medium',
    recommendedAction: 'approve',
    reasoning:
      'The current version stops receiving security patches next month. A trial run on a branch shows 204 of 210 tests pass unmodified and the remaining six need a documented one-line API change each — a contained, well-understood migration.',
    details:
      'Upgrades the e2e framework across the test monorepo. The migration branch already exists with the six required fixes applied; CI on that branch is green. The upgrade also cuts total e2e runtime by roughly 18% thanks to the new scheduler.',
  },
  {
    slug: 'card-security-4',
    agentId: 'security',
    title: 'Auto-patch minor CVEs in base images',
    summary: 'Apply this week’s low-severity CVE patches to 3 images.',
    confidence: 94,
    impact: '3 base images rebuilt',
    urgency: 'low',
    risk: 'low',
    recommendedAction: 'approve',
    reasoning:
      'All three CVEs are low severity (CVSS < 4) with no known exploits, and the patched packages have no breaking changes. Weekly patching keeps the vulnerability backlog at zero instead of letting low findings pile up into an audit problem.',
    details:
      'Rebuilds the node, python, and nginx base images with this week’s upstream patch releases, then redeploys the 14 services that consume them through the standard rolling deploy. Each image passes the smoke suite before promotion; total rollout time is about 25 minutes.',
  },
]

const AGENT_SEED_STATUS: Record<AgentId, Omit<AgentStatus, 'updatedAt'>> = {
  backend: { state: 'waiting_approval', message: 'Waiting on approval to deploy v2.1' },
  marketing: { state: 'waiting_approval', message: 'Spring campaign ready for sign-off' },
  finance: { state: 'working', message: 'Reconciling March transactions…' },
  qa: { state: 'working', message: 'Running nightly regression suite…' },
  security: { state: 'waiting_approval', message: 'Security actions pending review' },
}

export function seedState(now: number): AppState {
  const cards: ApprovalCard[] = SEED_CARDS.map((template, index) => {
    const { slug, ...fields } = template
    return {
      ...fields,
      id: slug,
      createdAt: now - (SEED_CARD_COUNT - index) * 60_000, // oldest first, 1 min apart
      status: 'pending' as const,
    }
  })

  return {
    cards,
    agents: Object.fromEntries(
      AGENT_IDS.map((id) => [
        id,
        { id, name: AGENT_NAMES[id], status: { ...AGENT_SEED_STATUS[id], updatedAt: now } },
      ]),
    ) as AppState['agents'],
  }
}
