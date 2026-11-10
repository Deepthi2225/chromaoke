import { useEffect, useState } from 'react'
import type { Mission } from '../data/missions'
import type { MissionProgress } from '../engine/storage'
import { Workbench } from './Workbench'

interface Props {
  mission: Mission
  progress?: MissionProgress
  onStart: (level: number) => void
  onBack: () => void
}

/** Step 2 of the core loop: diagnose the robot before repairing it. */
export function Briefing({ mission, progress, onStart, onBack }: Props) {
  const recommended = progress?.level ?? 1
  const [level, setLevel] = useState(recommended)
  const chosen = mission.levels[level - 1]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') onStart(level)
      if (event.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [level, onBack, onStart])

  return (
    <section className="briefing screen-enter">
      <button className="link-btn" onClick={onBack}>← Workshop</button>
      <div className="briefing-grid">
        <div className="robot-bay holo-panel arrival">
          <div className="bay-grid" aria-hidden />
          <Workbench mission={mission.id} mode="scan" progress={0} width={460} label={`Tek scanning ${mission.robot.name}'s damaged part`} />
          <div className="bay-caption"><strong>{mission.robot.name}</strong><span>{mission.robot.role}</span></div>
        </div>

        <div className="diagnosis holo-panel">
          <p className="eyebrow cyan">MISSION 0{mission.number} · {mission.tier.toUpperCase()}</p>
          <h1>{mission.name}</h1>
          <p className="malfunction">⚠ {mission.malfunction}</p>
          <ul className="diag-lines">
            {mission.diagnosis.map((line, i) => (
              <li key={line} style={{ animationDelay: `${0.25 + i * 0.35}s` }}><span>{'>'}</span> {line}</li>
            ))}
          </ul>
          <p className="muted">Skill focus: {mission.focus}</p>

          <p className="eyebrow">DIFFICULTY</p>
          <div className="level-picker" role="radiogroup" aria-label="Difficulty level">
            {mission.levels.map((l) => {
              const open = l.level <= recommended
              return (
                <button key={l.level} role="radio" aria-checked={level === l.level} disabled={!open} className={level === l.level ? 'active' : ''} onClick={() => setLevel(l.level)}>
                  <strong>LVL {l.level}</strong>
                  <small>{open ? `${l.targetWpm} WPM · ${l.timeLimit}s` : 'Locked'}</small>
                  {l.level === recommended && <em>Recommended</em>}
                </button>
              )
            })}
          </div>
          <p className="muted small">The adaptive engine raised or lowered your level from your last repair. Beat {chosen.targetWpm} WPM at 95% accuracy to unlock the next one.</p>
          <button className="primary-btn" onClick={() => onStart(level)}>BEGIN REPAIR <kbd>Enter</kbd></button>
        </div>
      </div>
    </section>
  )
}
