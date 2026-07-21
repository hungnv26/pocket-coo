/**
 * HomeSurface — the glanceable widget summary. Owned by: P2 (presentation).
 *
 * Shows only actionable info: pending-approvals count (tappable, opens the
 * Inbox), critical-alert count, one status line per agent, and a
 * "Reset demo" footer control.
 */
import type { AgentState } from '../domain/types'
import type { HomeSurfaceProps } from './contracts'

const STATE_LABELS: Record<AgentState, string> = {
  working: 'Working',
  waiting_approval: 'Waiting for approval',
  blocked: 'Blocked',
  idle: 'Idle',
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

export function HomeSurface({ counts, agents, onOpenInbox, onResetDemo }: HomeSurfaceProps) {
  return (
    <div className="surface home">
      <header className="home-header">
        <h1 className="app-name">Pocket COO</h1>
        <p className="app-tagline">Your agent team. Your call.</p>
      </header>

      <button type="button" className="approvals-cta" onClick={onOpenInbox}>
        <span className="approvals-count">{counts.pending}</span>
        <span className="approvals-label">
          {counts.pending === 1 ? 'approval waiting' : 'approvals waiting'}
        </span>
        {counts.pending > 0 && <span className="approvals-go">Review &#8250;</span>}
      </button>

      <div className="alert-lines">
        <p className={`alert-line${counts.critical > 0 ? ' alert-critical' : ' alert-quiet'}`}>
          {plural(counts.critical, 'critical alert')}
        </p>
        {counts.delayed > 0 && (
          <p className="alert-line alert-quiet">{plural(counts.delayed, 'request')} delayed until tomorrow</p>
        )}
      </div>

      <section className="agent-section" aria-label="Agent status">
        <h2 className="section-title">Agents</h2>
        {agents.length === 0 ? (
          <p className="empty-hint">No agents connected.</p>
        ) : (
          <ul className="agent-list">
            {agents.map((agent) => (
              <li key={agent.id} className="agent-row">
                <span className={`agent-dot agent-dot-${agent.status.state}`} aria-hidden="true" />
                <div className="agent-text">
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-message">{agent.status.message}</span>
                </div>
                <span className={`agent-state agent-state-${agent.status.state}`}>
                  {STATE_LABELS[agent.status.state]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="home-footer">
        <button type="button" className="btn btn-ghost btn-reset" onClick={onResetDemo}>
          Reset demo
        </button>
      </footer>
    </div>
  )
}
