import { useCallback, useEffect, useRef, useState } from 'react'
import type { Level, Mission } from '../data/missions'
import { sfx } from '../engine/sound'
import type { Settings } from '../engine/storage'
import { computeMetrics, type Keystroke, type SessionMetrics } from '../engine/typing'
import { Workbench } from './Workbench'
import type { RobotMood } from './Robot'

export interface RepairResult {
  metrics: SessionMetrics
  repaired: boolean
  timeLeft: number
  passage: string
  correctCharacters: number
}

interface Props {
  mission: Mission
  level: Level
  passage: string
  settings: Settings
  onFinish: (result: RepairResult) => void
  onAbort: () => void
}

const START_HEALTH = 18

export function RepairStation({ mission, level, passage, settings, onFinish, onAbort }: Props) {
  const [typed, setTyped] = useState('')
  const [now, setNow] = useState(0)
  const [combo, setCombo] = useState(0)
  const [errors, setErrors] = useState(0)
  const [glitch, setGlitch] = useState(0)
  const [lastError, setLastError] = useState(-10000)
  const [finished, setFinished] = useState<null | boolean>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [keyCount, setKeyCount] = useState({ total: 0, correct: 0 })
  const [lastEvent, setLastEvent] = useState<'hit' | 'slip'>('hit')

  const log = useRef<Keystroke[]>([])
  const startedAt = useRef<number | null>(null)
  const typedRef = useRef('')
  const doneRef = useRef(false)
  const stationRef = useRef<HTMLElement>(null)

  const elapsed = startTime ? now - startTime : 0
  const timeLeft = Math.max(0, level.timeLimit - Math.floor(elapsed / 1000))
  const correctPositions = [...typed].filter((char, i) => char === passage[i]).length
  const health = Math.round(START_HEALTH + (100 - START_HEALTH) * (correctPositions / passage.length))
  const wpm = elapsed > 1500 ? Math.round(correctPositions / 5 / (elapsed / 60000)) : 0
  const accuracy = keyCount.total ? Math.round((keyCount.correct / keyCount.total) * 100) : 100

  const finish = useCallback(
    (repaired: boolean) => {
      if (doneRef.current) return
      doneRef.current = true
      const end = startedAt.current ? performance.now() - startedAt.current : 1
      const correct = [...typedRef.current].filter((char, i) => char === passage[i]).length
      const metrics = computeMetrics(log.current, correct, end)
      setFinished(repaired)
      if (settings.sound) (repaired ? sfx.repaired : sfx.failed)()
      const left = Math.max(0, level.timeLimit - Math.floor(end / 1000))
      window.setTimeout(() => onFinish({ metrics, repaired, timeLeft: left, passage, correctCharacters: correct }), settings.reduceMotion ? 600 : 1800)
    },
    [level.timeLimit, onFinish, passage, settings.reduceMotion, settings.sound],
  )

  // Clock: only runs once the first key is pressed.
  useEffect(() => {
    if (finished !== null) return
    const id = window.setInterval(() => {
      if (!startedAt.current) return
      const t = performance.now()
      setNow(t)
      if (t - startedAt.current >= level.timeLimit * 1000) finish(false)
    }, 200)
    return () => window.clearInterval(id)
  }, [finish, finished, level.timeLimit])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (doneRef.current) return
      if (event.key === 'Escape') return onAbort()
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const t0 = performance.now()
      if (event.key === 'Backspace') {
        event.preventDefault()
        if (!typedRef.current.length || !startedAt.current) return
        typedRef.current = typedRef.current.slice(0, -1)
        log.current.push({ t: t0 - startedAt.current, kind: 'backspace', index: typedRef.current.length })
        setTyped(typedRef.current)
        setCombo(0)
        return
      }
      if (event.key.length !== 1) return
      event.preventDefault()
      if (!startedAt.current) {
        startedAt.current = t0
        setStartTime(t0)
        setNow(t0)
      }
      const index = typedRef.current.length
      const expected = passage[index]
      const correct = event.key === expected
      log.current.push({ t: t0 - startedAt.current, kind: 'char', index, expected, typed: event.key, correct })
      typedRef.current += event.key
      setTyped(typedRef.current)
      setNow(t0)
      setKeyCount((c) => ({ total: c.total + 1, correct: c.correct + (correct ? 1 : 0) }))
      setLastEvent(correct ? 'hit' : 'slip')
      if (correct) {
        setCombo((c) => c + 1)
        if (settings.sound) sfx.key()
      } else {
        setCombo(0)
        setErrors((e) => e + 1)
        // A short screen jolt on mistakes; off with reduce-motion or glitch effects disabled.
        if (settings.glitchEffects && !settings.reduceMotion) {
          stationRef.current?.animate(
            [{ transform: 'translate(0, 0)' }, { transform: 'translate(-4px, 2px)' }, { transform: 'translate(3px, -2px)' }, { transform: 'translate(0, 0)' }],
            { duration: 150, easing: 'ease-out' },
          )
        }
        setLastError(t0)
        if (settings.glitchEffects) setGlitch((g) => g + 1)
        if (settings.sound) sfx.error()
      }
      if (typedRef.current.length === passage.length) finish(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish, onAbort, passage, settings.glitchEffects, settings.reduceMotion, settings.sound])

  const recentlyHit = now - lastError < 700
  const mood: RobotMood = finished === true ? 'celebrating' : finished === false ? 'damaged' : recentlyHit ? 'struggling' : health < 40 ? 'damaged' : 'idle'
  const urgent = startTime !== null && timeLeft <= 10 && finished === null
  const progress = Math.round((typed.length / passage.length) * 100)

  return (
    <section ref={stationRef} className={`station screen-enter ${finished === true ? 'is-repaired' : ''}`}>
      <div className="station-head">
        <div>
          <p className="eyebrow cyan">MISSION 0{mission.number} · {mission.name.toUpperCase()} · LEVEL {level.level}</p>
          <h1>{finished === true ? `${mission.robot.name} restored` : finished === false ? 'System timeout' : mission.malfunction}</h1>
        </div>
        <div className={`timer ${urgent ? 'urgent' : ''}`} role="timer" aria-live="off">
          <span>TIME LEFT</span>
          <strong>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</strong>
        </div>
      </div>

      <div className="station-grid">
        <div className={`robot-bay holo-panel ${glitch && settings.glitchEffects ? 'glitching' : ''}`} key={`bay-${glitch}`}>
          <div className="bay-grid" aria-hidden />
          <Workbench
            mission={mission.id}
            mode={finished === true ? 'celebrate' : finished === false ? 'fail' : startTime ? 'weld' : 'scan'}
            progress={correctPositions / passage.length}
            hits={keyCount.correct}
            slips={errors}
            lastEvent={lastEvent}
            width={380}
            label={`Tek repairing ${mission.robot.name}'s part, ${Math.round((correctPositions / passage.length) * 100)}% restored; ${mission.robot.name} is ${mood}`}
          />
          <div className="bay-readout">
            <div className="health-row">
              <span>CORE INTEGRITY</span>
              <strong className={health < 40 ? 'warn' : 'ok'}>{health}%</strong>
            </div>
            <div className="meter"><i style={{ width: `${health}%`, background: health < 40 ? 'var(--error)' : health < 70 ? 'var(--warning)' : 'var(--success)' }} /></div>
          </div>
          {combo >= 10 && <div className="combo-badge" key={Math.floor(combo / 10)}>COMBO ×{combo}</div>}
        </div>

        <div className="terminal holo-panel">
          <div className="terminal-bar">
            <span><i /> REPAIR_TERMINAL // {mission.robot.name}</span>
            <span className={finished === null ? 'linked' : finished ? 'linked' : 'lost'}>{finished === false ? '● LINK LOST' : '● LINKED'}</span>
          </div>
          <div className={`passage ${mission.id === 'code' || mission.id === 'shutdown' ? 'mono-strong' : ''}`} aria-label="Repair command to type">
            {[...passage].map((char, i) => {
              const entered = typed[i]
              const state = entered === undefined ? (i === typed.length ? 'current' : '') : entered === char ? 'correct' : 'wrong'
              return (
                <span key={i} className={state}>
                  {state === 'wrong' && char === ' ' ? '·' : char}
                </span>
              )
            })}
          </div>
          <div className="terminal-foot">
            {finished !== null ? (finished ? 'Repair sequence complete. Compiling diagnostics…' : 'Time expired. Compiling diagnostics…') : startTime ? 'Input channel live · Backspace fixes · Esc aborts' : 'Start typing to begin the repair. The timer starts on your first key.'}
          </div>
          {finished === true && <CircuitTrace />}
        </div>
      </div>

      <div className="hud">
        <div><span>REPAIR PROGRESS</span><strong>{progress}%</strong><div className="meter"><i style={{ width: `${progress}%` }} /></div></div>
        <div><span>LIVE WPM</span><strong>{wpm}</strong><small>target {level.targetWpm}</small></div>
        <div><span>ACCURACY</span><strong>{accuracy}%</strong><small>{errors} error{errors === 1 ? '' : 's'}</small></div>
        <div><span>COMBO</span><strong className={combo >= 10 ? 'violet' : ''}>{combo}</strong><small>keys in a row</small></div>
      </div>
    </section>
  )
}

/** Circuit lines that trace around the terminal when a repair succeeds. */
function CircuitTrace() {
  return (
    <svg className="circuit-trace" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
      <path d="M0 190 H120 L140 170 H260 L280 190 H400" />
      <path d="M0 10 H90 L110 30 H300 L320 10 H400" />
      <path d="M10 0 V80 L30 100 V200" />
      <path d="M390 0 V120 L370 140 V200" />
    </svg>
  )
}
