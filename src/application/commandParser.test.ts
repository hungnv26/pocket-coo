import { describe, expect, it } from 'vitest'
import { parseCommand } from './commandParser'

describe('parseCommand — the five canonical shapes', () => {
  it('parses "Approve all low-risk actions"', () => {
    expect(parseCommand('Approve all low-risk actions')).toEqual({ intent: 'approve_bulk_low_risk' })
  })

  it('parses "Reject marketing campaign"', () => {
    expect(parseCommand('Reject marketing campaign')).toEqual({
      intent: 'reject_match',
      agentId: 'marketing',
      keyword: 'campaign',
    })
  })

  it('parses "Ask Backend why this changed"', () => {
    expect(parseCommand('Ask Backend why this changed')).toEqual({ intent: 'explain_agent', agentId: 'backend' })
  })

  it('parses "Delay until tomorrow"', () => {
    expect(parseCommand('Delay until tomorrow')).toEqual({ intent: 'delay_tomorrow' })
  })

  it('parses "Assign to QA"', () => {
    expect(parseCommand('Assign to QA')).toEqual({ intent: 'assign_agent', target: 'qa' })
  })
})

describe('parseCommand — wording drift tolerance', () => {
  it('handles case and hyphen variants of bulk approve', () => {
    expect(parseCommand('APPROVE ALL LOW RISK')).toEqual({ intent: 'approve_bulk_low_risk' })
    expect(parseCommand('approve low-risk stuff')).toEqual({ intent: 'approve_bulk_low_risk' })
  })

  it('handles "assign to QA agent" and "delegate to backend"', () => {
    expect(parseCommand('Assign to QA agent')).toEqual({ intent: 'assign_agent', target: 'qa' })
    expect(parseCommand('delegate to backend')).toEqual({ intent: 'assign_agent', target: 'backend' })
    expect(parseCommand('hand off to Security')).toEqual({ intent: 'assign_agent', target: 'security' })
  })

  it('handles "ask the Finance agent why" for any agent', () => {
    expect(parseCommand('ask the Finance agent why')).toEqual({ intent: 'explain_agent', agentId: 'finance' })
    expect(parseCommand('ask security why this changed')).toEqual({ intent: 'explain_agent', agentId: 'security' })
  })

  it('handles delay variants', () => {
    expect(parseCommand('delay')).toEqual({ intent: 'delay_tomorrow' })
    expect(parseCommand('push to tomorrow')).toEqual({ intent: 'delay_tomorrow' })
    expect(parseCommand('postpone this one')).toEqual({ intent: 'delay_tomorrow' })
  })

  it('handles reject with keyword only (no agent name)', () => {
    expect(parseCommand('reject campaign')).toEqual({ intent: 'reject_match', keyword: 'campaign' })
    expect(parseCommand('reject the newsletter')).toEqual({ intent: 'reject_match', keyword: 'newsletter' })
  })

  it('handles reject with agent only (empty keyword)', () => {
    expect(parseCommand('reject marketing')).toEqual({ intent: 'reject_match', agentId: 'marketing', keyword: '' })
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseCommand('  approve   all low-risk actions  ')).toEqual({ intent: 'approve_bulk_low_risk' })
  })
})

describe('parseCommand — unknown inputs', () => {
  it.each(['frobnicate everything', 'hello there, how are you?', 'approve'])('"%s" -> unknown', (raw) => {
    expect(parseCommand(raw)).toEqual({ intent: 'unknown', raw })
  })

  it('empty and blank input -> unknown', () => {
    expect(parseCommand('')).toEqual({ intent: 'unknown', raw: '' })
    expect(parseCommand('   ')).toEqual({ intent: 'unknown', raw: '   ' })
  })

  it('"ask" for a non-agent -> unknown', () => {
    expect(parseCommand('ask siri why')).toEqual({ intent: 'unknown', raw: 'ask siri why' })
  })

  it('never throws on garbage', () => {
    expect(() => parseCommand('🤖🤖🤖 \n\t $$$')).not.toThrow()
    expect(parseCommand('🤖🤖🤖').intent).toBe('unknown')
  })
})
