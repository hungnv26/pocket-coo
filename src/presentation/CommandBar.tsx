/**
 * CommandBar — persistent text command input, fixed near the bottom of the
 * Inbox for one-handed reach. Owned by: P2 (presentation).
 *
 * Renders inline command feedback, including the five-example help block
 * (D13) when feedback.showHelp is true.
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { COMMAND_EXAMPLES } from '../domain/types'
import type { CommandBarProps } from './contracts'

export function CommandBar({ onSubmitCommand, feedback }: CommandBarProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const raw = value.trim()
    if (!raw) return
    onSubmitCommand(raw)
    setValue('')
  }

  return (
    <div className="command-bar">
      {feedback && (
        <div
          className={`command-feedback${feedback.showHelp ? ' command-feedback-help' : ''}`}
          role="status"
        >
          <p className="command-feedback-message">{feedback.message}</p>
          {feedback.showHelp && (
            <ul className="command-examples">
              {COMMAND_EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    className="command-example"
                    onClick={() => setValue(example)}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <form className="command-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="command-input"
          placeholder='Try "Approve all low-risk actions"'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Command input"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-approve command-send">
          Send
        </button>
      </form>
    </div>
  )
}
