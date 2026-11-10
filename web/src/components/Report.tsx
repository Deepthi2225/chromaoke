import { useEffect } from 'react'
import type { Mission } from '../data/missions'
import type { DifficultyDecision } from '../engine/difficulty'
import type { SessionMetrics } from '../engine/typing'
import { Robot } from './Robot'

export interface ReportData {
  mission: Mission
  level: number
  metrics: SessionMetrics
  repaired: boolean
  xp: number
  stars: number
  decision: DifficultyDecision
  notes: string[]
  rankUp: boolean
}

export function Report({ data, onRetry, onHome }: { data: ReportData; onRetry: () => void; onHome: () => void }) {
  const { mission, metrics: m, repaired, decision } = data

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') onRetry()
      if (event.key === 'Escape') onHome()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onHome, onRetry])

  const peak = Math.max(1, ...m.wpmTimeline)
  return (
    <section className="report screen-enter">
      <div className="report-hero holo-panel">
        <div className="bay-grid" aria-hidden />
        <Robot mood={repaired ? 'celebrating' : 'damaged'} hue={mission.robot.hue} health={repaired ? 100 : 30} size={180} />
        <div>
          <p className={`eyebrow ${repaired ? 'mint' : 'coral'}`}>{repaired ? '✓ REPAIR COMPLETE' : '✕ REPAIR FAILED'}</p>
          <h1>{repaired ? `${mission.robot.name} is back online` : `${mission.robot.name} needs another try`}</h1>
          <div className="reward-row">
            <span className="stars big" aria-label={`${data.stars} of 3 stars`}>{[1, 2, 3].map((s) => <i key={s} className={s <= data.stars ? 'on' : ''} style={{ animationDelay: `${0.3 + s * 0.2}s` }}>★</i>)}</span>
            <span className="xp-gain">+{data.xp} XP</span>
            {data.rankUp && <span className="rank-up">RANK UP!</span>}
          </div>
        </div>
      </div>

      <div className="report-grid">
        <div className="holo-panel stat-panel">
          <p className="eyebrow">PERFORMANCE REPORT</p>
          <div className="stat-tiles">
            <div><span>WPM</span><strong>{m.wpm}</strong><small>raw {m.rawWpm}</small></div>
            <div><span>ACCURACY</span><strong>{m.accuracy}%</strong><small>{m.errors} errors</small></div>
            <div><span>CONSISTENCY</span><strong>{m.consistency}</strong><small>out of 100</small></div>
            <div><span>BURST</span><strong>{m.burstWpm}</strong><small>best 5 s, WPM</small></div>
            <div><span>TIME</span><strong>{m.elapsedSeconds.toFixed(1)}s</strong><small>level {data.level}</small></div>
            <div><span>CORRECTIONS</span><strong>{m.backspaces}</strong><small>backspaces</small></div>
          </div>
          {m.wpmTimeline.length > 2 && (
            <figure className="bars">
              <figcaption>Speed through the repair (WPM per 5 seconds)</figcaption>
              <div className="bar-row">
                {m.wpmTimeline.map((v, i) => (
                  <div key={i} className="bar" title={`${i * 5}-${i * 5 + 5}s: ${v} WPM`}>
                    <i style={{ height: `${Math.max(4, (v / peak) * 100)}%` }} />
                  </div>
                ))}
              </div>
            </figure>
          )}
        </div>

        <div className="holo-panel coach-report">
          <div className="coach-head">
            <span className="coach-avatar" aria-hidden>◉</span>
            <div><p className="eyebrow violet">R.O.B.I. NOTICED</p><strong>Session analysis</strong></div>
          </div>
          <ul>{data.notes.length ? data.notes.map((n) => <li key={n}>{n}</li>) : <li>Steady run. Keep going to build a fuller profile.</li>}</ul>
          <div className={`decision change-${decision.change}`}>
            <span>{decision.change === 1 ? '▲ LEVEL UP' : decision.change === -1 ? '▼ LEVEL DOWN' : '■ LEVEL HOLD'} · next: level {decision.level}</span>
            <p>{decision.reason}</p>
          </div>
          <div className="report-actions">
            <button className="primary-btn" onClick={onRetry}>REPAIR AGAIN <kbd>Enter</kbd></button>
            <button className="ghost-btn" onClick={onHome}>WORKSHOP <kbd>Esc</kbd></button>
          </div>
        </div>
      </div>
    </section>
  )
}
