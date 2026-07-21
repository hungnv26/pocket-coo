/**
 * Pocket COO — shared domain types (the team contract).
 *
 * RULES:
 * - This file is the frozen interface between work packages. Do not change a
 *   type another package consumes without agreeing in team/PLAN.md terms.
 * - Domain layer: pure TypeScript. No React, no browser APIs, no imports from
 *   application/infrastructure/presentation.
 */

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const AGENT_IDS = ['backend', 'marketing', 'finance', 'qa', 'security'] as const
export type AgentId = (typeof AGENT_IDS)[number]

export const AGENT_NAMES: Record<AgentId, string> = {
  backend: 'Backend',
  marketing: 'Marketing',
  finance: 'Finance',
  qa: 'QA',
  security: 'Security',
}

export type AgentState = 'working' | 'waiting_approval' | 'blocked' | 'idle'

export interface AgentStatus {
  state: AgentState
  message: string // e.g. "Deploying v2.1…"
  updatedAt: number // epoch ms
}

export interface Agent {
  id: AgentId
  name: string
  status: AgentStatus
}

// ---------------------------------------------------------------------------
// Approval cards
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high'
export type Urgency = 'low' | 'medium' | 'high'
export type RecommendedAction = 'approve' | 'reject' | 'review'
export type CardStatus = 'pending' | 'approved' | 'rejected' | 'delegated' | 'delayed'

/** Delegate target: another agent, or "Tomorrow (delay)". */
export type DelegateTarget = AgentId | 'tomorrow'

export interface ApprovalCard {
  id: string
  agentId: AgentId
  title: string
  summary: string // one line, shown on the card
  confidence: number // 0–100, shown as a percentage
  impact: string // e.g. "+$1,200 MRR", "affects 3,000 users"
  urgency: Urgency
  risk: RiskLevel // drives "Approve all low-risk actions"
  recommendedAction: RecommendedAction
  reasoning: string // Explain ("Why?") sheet content
  details: string // Details sheet content
  createdAt: number // epoch ms
  status: CardStatus
  resolution?: {
    decidedAt: number // epoch ms
    target?: DelegateTarget // set for delegated/delayed
  }
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export type Decision =
  | { kind: 'approve' }
  | { kind: 'reject' }
  | { kind: 'delegate'; target: DelegateTarget } // target 'tomorrow' => status 'delayed'

// ---------------------------------------------------------------------------
// Commands (rule-based parser output — D12)
// ---------------------------------------------------------------------------

export type Command =
  | { intent: 'approve_bulk_low_risk' }
  | { intent: 'reject_match'; agentId?: AgentId; keyword: string }
  | { intent: 'explain_agent'; agentId: AgentId }
  | { intent: 'delay_tomorrow' }
  | { intent: 'assign_agent'; target: AgentId }
  | { intent: 'unknown'; raw: string }

/** The five canonical examples shown in the "Didn't understand" help (D13). */
export const COMMAND_EXAMPLES = [
  'Approve all low-risk actions',
  'Reject marketing campaign',
  'Ask Backend why this changed',
  'Delay until tomorrow',
  'Assign to QA',
] as const

// ---------------------------------------------------------------------------
// App state + actions (single reducer owns all state transitions)
// ---------------------------------------------------------------------------

export interface AppState {
  cards: ApprovalCard[] // all cards, any status; pending = derived
  agents: Record<AgentId, Agent>
}

export type AppAction =
  | { type: 'DECIDE'; cardId: string; decision: Decision; now: number }
  | { type: 'BULK_APPROVE_LOW_RISK'; now: number }
  | { type: 'REJECT_MATCH'; agentId?: AgentId; keyword: string; now: number }
  | { type: 'CARD_ARRIVED'; card: ApprovalCard }
  | { type: 'AGENT_STATUS'; agentId: AgentId; status: AgentStatus }
  | { type: 'RESET'; state: AppState }

// ---------------------------------------------------------------------------
// Derived-state selectors (contract; implemented in domain/selectors.ts)
// ---------------------------------------------------------------------------

export interface QueueCounts {
  pending: number
  critical: number // pending cards with risk === 'high' || urgency === 'high'
  delayed: number
}

// ---------------------------------------------------------------------------
// Constants (D8)
// ---------------------------------------------------------------------------

export const SEED_CARD_COUNT = 20
export const MAX_PENDING = 30
export const SPAWN_INTERVAL_MS: readonly [number, number] = [20_000, 40_000]
/** Agent resume: decision -> in-progress status -> completed status (~5 s total). */
export const RESUME_IN_PROGRESS_MS = 1_500
export const RESUME_COMPLETED_MS = 4_500
