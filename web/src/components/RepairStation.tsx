import { useCallback, useEffect, useRef, useState } from 'react'
import type { Level, Mission } from '../data/missions'
import { sfx } from '../engine/sound'
import type { Settings } from '../engine/storage'
import { computeMetrics, type Keystroke, type SessionMetrics } from '../engine/typing'
import type { MissionId } from '../data/missions'
import { MissionScene } from './MissionScene'

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

/** In-world terminal header and status readout for each mission (from the concept art). */
const CONSOLE: Record<MissionId, { command: string; script: string }> = {
  battery: { command: 'STABILIZE THE CELL', script: '>LOAD ENERGY_VAULT.PY' },
  circuit: { command: 'RESTORE CIRCUIT TRACES', script: '>LOAD ROUTING_MATRIX.PY' },
  code: { command: 'DEBUGGING ACTIVE', script: '>DECRYPTION_RETRY' },
  comms: { command: 'BYPASS FREQUENCY', script: '>EXECUTE COMM_LINK.PY' },
  shutdown: { command: 'INITIATE SCRAM SEQUENCE', script: '>FORCE_CORE_OVERRIDE.PY' },
}

function status(mission: MissionId, pct: number): { label: string; value: number; state: string; tone: 'good' | 'warn' | 'bad' } {
  const tone = pct >= 100 ? 'good' : pct >= 50 ? 'warn' : 'bad'
  switch (mission) {
    case 'battery':
      return { label: 'BATTERY', value: pct, state: pct >= 100 ? 'STABLE' : 'STABILIZING', tone }
    case 'circuit':
      return { label: 'CIRCUIT', value: pct, state: 'RECONSTRUCTED', tone }
    case 'code':
      return pct >= 100 ? { label: 'SYSTEM', value: 0, state: 'CLEAN', tone: 'good' } : { label: 'SYSTEM', value: 100 - pct, state: 'CORRUPTED', tone: pct >= 50 ? 'warn' : 'bad' }
    case 'comms':
      return { label: 'SIGNAL STABILITY', value: pct, state: pct >= 100 ? 'LOCKED' : 'SEARCHING', tone }
    case 'shutdown':
      return { label: 'CONTAINMENT', value: pct, state: pct >= 100 ? 'SECURED' : pct >= 50 ? 'RECOVERING' : 'FAILING', tone }
  }
}

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

  const urgent = startTime !== null && timeLeft <= 10 && finished === null
  const progress = Math.round((typed.length / passage.length) * 100)
  const restored = Math.round((correctPositions / passage.length) * 100)
  const readout = status(mission.id, finished === true ? 100 : restored)
  const filled = Math.round((readout.value / 100) * 5)
  const danger = mission.id === 'shutdown'
  const flinch = now - lastError < 700

  return (
    <section ref={stationRef} className={`station station-stage screen-enter ${danger ? 'danger' : ''} ${finished === true ? 'is-repaired' : ''}`}>
      <div className="mission-stage">
        <MissionScene
          mission={mission.id}
          mode={finished === true ? 'celebrate' : finished === false ? 'fail' : startTime ? 'weld' : 'scan'}
          progress={correctPositions / passage.length}
          hits={keyCount.correct}
          slips={errors}
          lastEvent={lastEvent}
          fit="cover"
          label={`Mission ${mission.number}: Tek repairing ${mission.robot.name}, ${restored}% restored${flinch ? ', after a slip' : ''}`}
        />
        {glitch > 0 && settings.glitchEffects && <div className="glitch-flash" key={glitch} aria-hidden />}

        <div className="ms-title">
          <h1>MISSION 0{mission.number}: {mission.name.toUpperCase()}</h1>
          <p>LEVEL {level.level} · {finished === true ? `${mission.robot.name} RESTORED` : finished === false ? 'SYSTEM TIMEOUT' : mission.malfunction.toUpperCase()}</p>
        </div>

        <div className={`ms-timer ${urgent ? 'urgent' : ''}`} role="timer" aria-live="off">
          <span>TIME LEFT</span>
          <strong>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</strong>
          {combo >= 10 && <em className="combo-badge" key={Math.floor(combo / 10)}>COMBO ×{combo}</em>}
        </div>

        <div className={`ms-status tone-${readout.tone}`} aria-label={`${readout.label} ${readout.value} percent, ${readout.state}`}>
          <div className="ms-cells">
            {[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < filled ? 'on' : ''} />)}
            <b />
          </div>
          <p>{readout.label}: {readout.value}%</p>
          <p>{readout.state}</p>
        </div>

        <div className="ms-terminal">
          <div className="ms-term-bar"><span>TYPING</span><span aria-hidden>_ □ ×</span></div>
          <div className="ms-term-body">
            <p className="ms-cmd">{CONSOLE[mission.id].command}<br />{CONSOLE[mission.id].script}</p>
            <div className="passage" aria-label="Repair command to type">
              <span className="prompt" aria-hidden>&gt;</span>
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
            <p className="ms-foot">
              {finished !== null ? (finished ? 'Repair sequence complete. Compiling diagnostics…' : 'Time expired. Compiling diagnostics…') : startTime ? 'Backspace fixes · Esc aborts' : 'Start typing to begin. The timer starts on your first key.'}
            </p>
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
