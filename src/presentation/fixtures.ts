/**
 * Presentation fixtures — fake props for standalone development of P2
 * components (DevHarness). Owned by: P2. NOT the demo seed — P1 owns
 * src/domain/seed.ts; nothing outside src/presentation/dev should import this.
 */
import type { Agent, AgentId, ApprovalCard, QueueCounts } from '../domain/types'
import { AGENT_NAMES } from '../domain/types'

const T0 = 1_752_000_000_000 // fixed epoch base so fixtures are deterministic

function agent(id: AgentId, state: Agent['status']['state'], message: string): Agent {
  return { id, name: AGENT_NAMES[id], status: { state, message, updatedAt: T0 } }
}

export const fixtureAgents: Agent[] = [
  agent('backend', 'waiting_approval', 'Waiting to deploy v2.1 to production'),
  agent('marketing', 'working', 'Drafting spring campaign variants'),
  agent('finance', 'waiting_approval', 'Monthly vendor payments queued'),
  agent('qa', 'working', 'Running regression suite on release branch'),
  agent('security', 'blocked', 'Awaiting decision on dependency patch'),
]

let n = 0
function card(
  agentId: AgentId,
  title: string,
  summary: string,
  confidence: number,
  impact: string,
  urgency: ApprovalCard['urgency'],
  risk: ApprovalCard['risk'],
  recommendedAction: ApprovalCard['recommendedAction'],
): ApprovalCard {
  n += 1
  return {
    id: `fixture-${agentId}-${n}`,
    agentId,
    title,
    summary,
    confidence,
    impact,
    urgency,
    risk,
    recommendedAction,
    reasoning: `I recommend this because the change matches our runbook, telemetry over the last 7 days supports it, and the blast radius is limited. Rolling back takes under two minutes if anything regresses. (${title})`,
    details: `Full request: ${summary} This action touches production configuration, was generated automatically from the agent's task queue, and has passed all automated pre-checks. Review the impact estimate before approving.`,
    createdAt: T0 + n * 60_000,
    status: 'pending',
  }
}

export const fixtureCards: ApprovalCard[] = [
  card(
    'backend',
    'Deploy v2.1 to production',
    'Ship the queued release with 14 merged PRs to all regions.',
    92,
    'affects 3,000 users',
    'high',
    'medium',
    'approve',
  ),
  card(
    'marketing',
    'Launch spring email campaign',
    'Send the A/B-tested campaign to the 12k-subscriber list.',
    84,
    '+$1,200 MRR est.',
    'medium',
    'low',
    'approve',
  ),
  card(
    'finance',
    'Pay $4,800 vendor invoice',
    'Settle the March cloud-hosting invoice two days early for a 2% discount.',
    97,
    '-$4,704 cash',
    'low',
    'low',
    'approve',
  ),
  card(
    'security',
    'Force-rotate all API keys',
    'Rotate every production API key after a suspicious login attempt.',
    71,
    'affects all integrations',
    'high',
    'high',
    'review',
  ),
  card(
    'qa',
    'Skip flaky checkout tests',
    'Temporarily quarantine 3 flaky checkout tests to unblock the release.',
    64,
    'coverage -2%',
    'medium',
    'medium',
    'reject',
  ),
]

export function fixtureCounts(cards: ApprovalCard[]): QueueCounts {
  const pending = cards.filter((c) => c.status === 'pending')
  return {
    pending: pending.length,
    critical: pending.filter((c) => c.risk === 'high' || c.urgency === 'high').length,
    delayed: cards.filter((c) => c.status === 'delayed').length,
  }
}
