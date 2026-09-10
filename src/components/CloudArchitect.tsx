import { useMemo, useState } from 'react'
import {
  analyzeWorkspace,
  recommend,
  DEFAULT_REQUIREMENTS,
  type Requirements,
} from '../architect/engine'
import ArchDiagram from '../architect/ArchDiagram'
import './CloudArchitect.css'

// Log-scale slider: 0..40 → 1..10000 RPS
function sliderToRps(v: number): number {
  return Math.round(10 ** (v / 10))
}

function rpsToSlider(rps: number): number {
  return Math.round(Math.log10(Math.max(1, rps)) * 10)
}

interface CloudArchitectProps {
  files: Record<string, string>
  onClose: () => void
}

export default function CloudArchitect({ files, onClose }: CloudArchitectProps) {
  const [req, setReq] = useState<Requirements>(DEFAULT_REQUIREMENTS)

  const analysis = useMemo(() => analyzeWorkspace(files), [files])
  const arch = useMemo(() => recommend(analysis, req), [analysis, req])

  function set<K extends keyof Requirements>(key: K, value: Requirements[K]) {
    setReq((r) => ({ ...r, [key]: value }))
  }

  return (
    <div className="architect-overlay">
      <div className="architect mc-panel">
        <header className="architect-header">
          <div>
            <span className="architect-title">☁ CLOUD ARCHITECT</span>
            <span className="architect-subtitle mc-dim">
              AI Deploy Advisor — deterministic heuristics, no API keys
            </span>
          </div>
          <button className="mc-button architect-close" onClick={onClose}>
            ✕ Close
          </button>
        </header>

        <div className="architect-body">
          {/* Left: requirements + advisor chat */}
          <div className="architect-left">
            <section className="architect-controls mc-panel">
              <h3 className="architect-section-title">REQUIREMENTS</h3>

              <label className="architect-control">
                <span className="architect-control-label">
                  Expected traffic:{' '}
                  <b className="mc-yellow">{req.rps.toLocaleString()} RPS</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={rpsToSlider(req.rps)}
                  onChange={(e) => set('rps', sliderToRps(Number(e.target.value)))}
                  className="architect-slider"
                />
              </label>

              <label className="architect-toggle">
                <input
                  type="checkbox"
                  checked={req.database}
                  onChange={(e) => set('database', e.target.checked)}
                />
                <span>Needs a database</span>
              </label>

              <label className="architect-toggle">
                <input
                  type="checkbox"
                  checked={req.realtime}
                  onChange={(e) => set('realtime', e.target.checked)}
                />
                <span>Realtime / WebSockets</span>
              </label>

              <label className="architect-toggle">
                <input
                  type="checkbox"
                  checked={req.global}
                  onChange={(e) => set('global', e.target.checked)}
                />
                <span>Global users</span>
              </label>

              <div className="architect-budget">
                <span className="architect-control-label">Budget</span>
                <div className="architect-budget-options">
                  {(['hobby', 'startup', 'enterprise'] as const).map((b) => (
                    <button
                      key={b}
                      className={`architect-budget-btn ${req.budget === b ? 'active' : ''}`}
                      onClick={() => set('budget', b)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="architect-chat mc-panel">
              <h3 className="architect-section-title">DEPLOYBOT SAYS…</h3>
              <div className="architect-chat-scroll">
                {arch.reasoning.map((line, i) => (
                  <p key={`${i}-${line.slice(0, 24)}`} className="architect-chat-line">
                    <span className="architect-chat-name">&lt;DeployBot&gt;</span>{' '}
                    {line}
                  </p>
                ))}
              </div>
            </section>
          </div>

          {/* Right: diagram + components */}
          <div className="architect-right">
            <div className="architect-verdict">
              <span className="architect-verdict-title mc-yellow">{arch.title}</span>
              <span className="architect-verdict-cost mc-aqua">{arch.costTier}</span>
            </div>

            <ArchDiagram arch={arch} global={req.global} />

            <ul className="architect-components">
              {arch.components.map((c) => (
                <li key={c.id} className="architect-component">
                  <span className="architect-component-name">
                    {c.name} <span className="mc-dim">({c.cost})</span>
                  </span>
                  <span className="architect-component-why">{c.why}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
