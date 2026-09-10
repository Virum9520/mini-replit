import { useEffect, useRef } from 'react'
import type { ConsoleMessage } from '../runner/types'
import './ConsolePane.css'

const PREFIXES: Record<ConsoleMessage['level'], { tag: string; className: string }> = {
  system: { tag: '[Server]', className: 'console-system' },
  log: { tag: '<world>', className: 'console-log' },
  info: { tag: '<world>', className: 'console-info' },
  warn: { tag: '[!]', className: 'console-warn' },
  error: { tag: '[✖]', className: 'console-error' },
}

interface ConsolePaneProps {
  messages: ConsoleMessage[]
  onClear: () => void
}

export default function ConsolePane({ messages, onClear }: ConsolePaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div className="console">
      <div className="console-header">
        <span className="console-title">CHAT (CONSOLE)</span>
        <button className="console-clear" onClick={onClear} title="Clear console">
          clear
        </button>
      </div>
      <div className="console-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="console-empty mc-dim">
            Press ▶ RUN to execute the active file…
          </p>
        )}
        {messages.map((m) => {
          const p = PREFIXES[m.level]
          return (
            <p key={m.id} className={`console-line ${p.className}`}>
              <span className="console-prefix">{p.tag}</span> {m.text}
            </p>
          )
        })}
      </div>
    </div>
  )
}
