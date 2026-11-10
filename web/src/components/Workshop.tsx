// The Workshop: a full-width stage where the HUD lives inside the game world
// (stats as a hologram, R.O.B.I. as a drone, the collection as recharge pods),
// with mission cartridges slotted into a console below.

import { useState, type CSSProperties } from 'react'
import { MISSIONS, type Mission, type MissionId } from '../data/missions'
import { recommendation } from '../engine/coach'
import { sfx } from '../engine/sound'
import { isUnlocked, rankFor, type SaveData } from '../engine/storage'
import { Workbench } from './Workbench'

const DAILY_GOAL = 3

export function Workshop({ save, onSelect }: { save: SaveData; onSelect: (id: MissionId) => void }) {
  const rank = rankFor(save.xp)
  const unlocked = (id: MissionId) => isUnlocked(save, MISSIONS.findIndex((m) => m.id === id))
  const tip = recommendation(save.profile, save.history, unlocked)
  const [today] = useState(() => new Date().toDateString())
  const repairsToday = save.history.filter((r) => r.repaired && new Date(r.at).toDateString() === today).length
  const last = save.history[save.history.length - 1]
  const owned = (m: Mission) => (save.missions[m.id]?.repairs ?? 0) > 0
  const rescued = MISSIONS.filter(owned).length
  // Next repair: the first unlocked mission not yet fixed, otherwise the last unlocked one.
  const open = MISSIONS.filter((m) => unlocked(m.id))
  const next = open.find((m) => !owned(m)) ?? open[open.length - 1]

  return (
    <section className="workshop screen-enter">
      <div className="stage">
        <div className="stage-art">
          <Workbench
            mission={next.id}
            mode="demo"
            progress={0.55}
            wide
            env="workshop"
            width={1600}
            pods={MISSIONS.map((m) => ({ name: m.robot.name, hue: m.robot.hue, owned: owned(m) }))}
            label={`Repair facility 7: Tek working on the ${next.name} part, with ${rescued} of ${MISSIONS.length} rescued robots in the recharge bay`}
          />
        </div>

        <div className="stage-title">
          <p className="eyebrow cyan">YEAR 2089 · REPAIR FACILITY 7</p>
          <h1>The Glitch is spreading.<br />Robots need you.</h1>
          <p className="stage-sub">Every repair is a typing challenge. Type accurately and quickly before their systems fail.</p>
          <button className="primary-btn stage-cta" onClick={() => onSelect(next.id)}>
            <span>▶ {owned(next) ? 'REPAIR AGAIN' : 'START REPAIR'}</span>
            <small>M-0{next.number} · {next.name}</small>
          </button>
        </div>

        <div className="hologram" aria-label="Technician stats">
          <p className="holo-title">TECH DIAGNOSTICS</p>
          <div className="holo-grid">
            <div><span>RANK</span><strong>{rank.rank}</strong></div>
            <div><span>LAST WPM</span><strong>{last?.wpm ?? '--'}</strong></div>
            <div><span>ACCURACY</span><strong>{last ? `${Math.round(last.accuracy)}%` : '--'}</strong></div>
            <div><span>TODAY</span><strong>{Math.min(repairsToday, DAILY_GOAL)}/{DAILY_GOAL}</strong></div>
          </div>
          <div className="holo-meter" aria-label={`${rank.into} of ${rank.need} XP to rank ${rank.rank + 1}`}><i style={{ width: `${(rank.into / rank.need) * 100}%` }} /></div>
        </div>

        <div className="robi">
          <div className="robi-bubble" role="status">
            <p className="eyebrow violet">R.O.B.I. · AI COACH</p>
            <strong>{tip.title}</strong>
            <p>{tip.body}<span className="robi-cursor" aria-hidden>▌</span></p>
          </div>
          <RobiDrone />
        </div>

        <p className="bay-label">RECHARGE BAY · {rescued}/{MISSIONS.length} RESCUED</p>
      </div>

      <div className="console">
        <div className="console-head">
          <span className="screw" aria-hidden />
          <p>MISSION CARTRIDGES</p>
          <span className="console-hint">Insert a cartridge to begin a repair</span>
          <span className="screw" aria-hidden />
        </div>
        <div className="cart-row">
          {MISSIONS.map((mission, index) => (
            <Cartridge key={mission.id} mission={mission} save={save} unlocked={isUnlocked(save, index)} sound={save.settings.sound} onSelect={onSelect} />
          ))}
        </div>
        <div className="slot-rail" aria-hidden />
      </div>
    </section>
  )
}

function Cartridge({ mission, save, unlocked, sound, onSelect }: { mission: Mission; save: SaveData; unlocked: boolean; sound: boolean; onSelect: (id: MissionId) => void }) {
  const progress = save.missions[mission.id]
  const repaired = (progress?.repairs ?? 0) > 0
  return (
    <button
      className={`cart ${unlocked ? '' : 'locked'} ${repaired ? 'done' : ''}`}
      disabled={!unlocked}
      onClick={() => onSelect(mission.id)}
      onMouseEnter={() => unlocked && sound && sfx.hover()}
      style={{ '--hue': mission.robot.hue } as CSSProperties}
      aria-label={unlocked ? `Mission ${mission.number}: ${mission.name}, ${mission.tier}` : `Mission ${mission.number}: ${mission.name}, encrypted. Repair mission ${mission.number - 1} to unlock.`}
    >
      <span className="cart-grip" aria-hidden />
      <span className="cart-label">
        {unlocked ? (
          <Workbench
            mission={mission.id}
            mode={repaired ? 'celebrate' : 'demo'}
            progress={repaired ? 1 : 0.4}
            detail="card"
            width={260}
            label={`${mission.name} workbench`}
          />
        ) : (
          <span className="encrypted">
            <span className="static" />
            <span className="tape">ENCRYPTED · ENCRYPTED · ENCRYPTED</span>
            <svg className="padlock" viewBox="0 0 24 24" aria-hidden>
              <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="currentColor" />
              <circle cx="12" cy="15.5" r="1.8" fill="#0B1020" />
            </svg>
          </span>
        )}
      </span>
      <span className="cart-body">
        <span className="cart-num">M-0{mission.number}</span>
        <strong>{mission.name}</strong>
        <span className="cart-tier">{mission.tier}</span>
        <span className="cart-focus">{unlocked ? mission.focus : `Repair M-0${mission.number - 1} to decrypt.`}</span>
        <span className="cart-foot">
          {unlocked ? (
            <>
              <span>LVL {progress?.level ?? 1}/{mission.levels.length}</span>
              <span className="stars" aria-label={`${progress?.bestStars ?? 0} of 3 stars`}>{[1, 2, 3].map((s) => <i key={s} className={s <= (progress?.bestStars ?? 0) ? 'on' : ''}>★</i>)}</span>
            </>
          ) : (
            <span className="locked-tag">● LOCKED</span>
          )}
        </span>
      </span>
      <span className="cart-pins" aria-hidden />
    </button>
  )
}

/** R.O.B.I. as a small hovering drone companion. Original artwork. */
function RobiDrone() {
  return (
    <svg className="robi-drone" viewBox="0 0 80 80" aria-hidden>
      <defs>
        <linearGradient id="robi-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6E0FF" />
          <stop offset="1" stopColor="#8F7FE0" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="72" rx="12" ry="3" fill="#A78BFA" opacity="0.35" className="robi-thrust" />
      <path d="M33 58 l7 12 l7 -12z" fill="#A78BFA" opacity="0.35" className="robi-thrust" />
      <ellipse cx="14" cy="22" rx="12" ry="2.5" fill="#C9B8FF" opacity="0.7" className="robi-rotor" />
      <ellipse cx="66" cy="22" rx="12" ry="2.5" fill="#C9B8FF" opacity="0.7" className="robi-rotor r2" />
      <rect x="10" y="24" width="8" height="12" rx="3" fill="#3B3468" />
      <rect x="62" y="24" width="8" height="12" rx="3" fill="#3B3468" />
      <circle cx="40" cy="40" r="22" fill="url(#robi-shell)" stroke="#5B4BB0" strokeWidth="2.5" />
      <ellipse cx="33" cy="28" rx="8" ry="4" fill="#FFFFFF" opacity="0.6" transform="rotate(-25 33 28)" />
      <rect x="25" y="34" width="30" height="16" rx="8" fill="#0B1020" />
      <circle cx="40" cy="42" r="5.5" fill="#A78BFA" className="robi-eye" />
      <circle cx="38.5" cy="40.5" r="1.6" fill="#FFFFFF" />
      <line x1="40" y1="18" x2="40" y2="10" stroke="#5B4BB0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="9" r="3" fill="#FFCA70" className="robi-bulb" />
    </svg>
  )
}
