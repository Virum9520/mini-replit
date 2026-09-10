import { useState, type FormEvent } from 'react'
import './PasswordGate.css'

const PASSWORD = 'For_Replit'
export const UNLOCK_KEY = 'mini-replit-unlocked'

interface PasswordGateProps {
  onUnlock: () => void
}

export default function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (value === PASSWORD) {
      sessionStorage.setItem(UNLOCK_KEY, '1')
      onUnlock()
    } else {
      setError(true)
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
    }
  }

  return (
    <div className="gate">
      <div className="gate-sky" />
      <div className="gate-ground" />

      <div className={`gate-panel mc-panel ${shaking ? 'gate-shake' : ''}`}>
        <div className="gate-logo">
          <span className="gate-logo-mini">MINI</span>
          <span className="gate-logo-replit">REPLIT</span>
        </div>
        <div className="gate-splash">Also try Replit!</div>

        <p className="gate-subtitle">Minecraft-Themed Browser IDE</p>
        <p className="gate-motd">
          <span className="mc-dim">A private server — enter the </span>
          <span className="mc-aqua">password</span>
          <span className="mc-dim"> to join.</span>
        </p>

        <form className="gate-form" onSubmit={handleSubmit}>
          <label className="gate-label" htmlFor="gate-password">
            Server Password
          </label>
          <input
            id="gate-password"
            className="mc-input gate-input"
            type="password"
            placeholder="•••••••••"
            value={value}
            autoFocus
            onChange={(e) => {
              setValue(e.target.value)
              setError(false)
            }}
          />
          {error && (
            <p className="gate-error mc-red">
              Incorrect password! Check the README / job application.
            </p>
          )}
          <button type="submit" className="mc-button mc-button-green gate-join">
            Join Server
          </button>
        </form>
      </div>

      <p className="gate-footer mc-dim">
        Not affiliated with Mojang or Replit — a fan-made project.
      </p>
    </div>
  )
}
