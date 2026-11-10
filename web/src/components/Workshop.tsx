import { useState, type CSSProperties } from 'react'
import { MISSIONS, type Mission, type MissionId } from '../data/missions'
import { recommendation } from '../engine/coach'
import { isUnlocked, rankFor, type SaveData } from '../engine/storage'
import { Robot } from './Robot'

const DAILY_GOAL = 3

export function Workshop({ save, onSelect }: { save: SaveData; onSelect: (id: MissionId) => void }) {
  const rank = rankFor(save.xp)
  const tip = recommendation(save.profile, save.history)
  const [today] = useState(() => new Date().toDateString())
  const repairsToday = save.history.filter((r) => r.repaired && new Date(r.at).toDateString() === today).length
  const last = save.history[save.history.length - 1]
  const repairedRobots = MISSIONS.filter((m) => (save.missions[m.id]?.repairs ?? 0) > 0)

  return (
    <section className="workshop screen-enter">
      <div className="workshop-top">
        <div className="hero holo-panel">
          <div className="hero-copy">
            <p className="eyebrow cyan">YEAR 2089 · REPAIR FACILITY 7</p>
            <h1>The Glitch is spreading.<br />Robots need you.</h1>
            <p className="muted">Every repair is a typing challenge. Type accurately and quickly before their systems fail.</p>
            <div className="hero-stats">
              <div><span>RANK</span><strong>{rank.rank}</strong></div>
              <div><span>LAST WPM</span><strong>{last?.wpm ?? '–'}</strong></div>
              <div><span>LAST ACCURACY</span><strong>{last ? `${last.accuracy}%` : '–'}</strong></div>
              <div>
                <span>TODAY</span>
                <strong>{Math.min(repairsToday, DAILY_GOAL)}/{DAILY_GOAL}</strong>
                <div className="meter small"><i style={{ width: `${(Math.min(repairsToday, DAILY_GOAL) / DAILY_GOAL) * 100}%` }} /></div>
              </div>
            </div>
          </div>
          <div className="hero-robot"><Robot mood={save.history.length ? 'repaired' : 'idle'} hue={190} size={190} label="R.O.B.I., your coach" /></div>
        </div>

        <aside className="coach holo-panel">
          <div className="coach-head">
            <span className="coach-avatar" aria-hidden>◉</span>
            <div><p className="eyebrow violet">R.O.B.I. · AI COACH</p><strong>{tip.title}</strong></div>
          </div>
          <p>{tip.body}</p>
          <div className="collection">
            <p className="eyebrow">ROBOT COLLECTION · {repairedRobots.length}/{MISSIONS.length}</p>
            <div className="collection-row">
              {MISSIONS.map((m) => {
                const owned = repairedRobots.includes(m)
                return (
                  <div key={m.id} className={`collected ${owned ? '' : 'missing'}`} title={owned ? m.robot.name : 'Not repaired yet'}>
                    <Robot mood={owned ? 'repaired' : 'idle'} hue={owned ? m.robot.hue : 220} size={44} label={owned ? m.robot.name : 'Unknown robot'} />
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      </div>

      <div className="section-title"><h2>Repair queue</h2><span className="muted">Five missions, each training a different skill</span></div>
      <div className="mission-grid">
        {MISSIONS.map((mission, index) => (
          <MissionCard key={mission.id} mission={mission} save={save} unlocked={isUnlocked(save, index)} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}

function MissionCard({ mission, save, unlocked, onSelect }: { mission: Mission; save: SaveData; unlocked: boolean; onSelect: (id: MissionId) => void }) {
  const progress = save.missions[mission.id]
  return (
    <button className={`mission-card holo-panel ${unlocked ? '' : 'locked'}`} disabled={!unlocked} onClick={() => onSelect(mission.id)} style={{ '--hue': mission.robot.hue } as CSSProperties}>
      <div className="card-robot"><Robot mood={progress?.repairs ? 'repaired' : unlocked ? 'damaged' : 'idle'} hue={unlocked ? mission.robot.hue : 220} size={92} health={progress?.repairs ? 100 : 30} /></div>
      <span className="card-num">0{mission.number}</span>
      <strong>{mission.name}</strong>
      <span className="card-tier">{mission.tier}</span>
      <p>{mission.focus}</p>
      <div className="card-foot">
        {unlocked ? (
          <>
            <span>LVL {progress?.level ?? 1}/{mission.levels.length}</span>
            <span className="stars" aria-label={`${progress?.bestStars ?? 0} of 3 stars`}>{[1, 2, 3].map((s) => <i key={s} className={s <= (progress?.bestStars ?? 0) ? 'on' : ''}>★</i>)}</span>
          </>
        ) : (
          <span>🔒 Repair {mission.number - 1 > 0 ? `mission 0${mission.number - 1}` : ''} to unlock</span>
        )}
      </div>
    </button>
  )
}
