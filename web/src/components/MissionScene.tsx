// A mission's repair scene (16:9). Each mission has its own location, camera
// framing, part and a different pose for Tek: probing a cell, soldering a wafer,
// typing at a terminal, welding a railing junction or turning a valve wheel.

import { useId, type ComponentType } from 'react'
import type { MissionId } from '../data/missions'
import * as Sets from './missionSets'
import type { SceneProps } from './missionSets'
import { solveElbow, type BenchMode, type Id, type Point } from './sceneTypes'
import { PAINTED } from './paintedScenes'
import { Arm, Defs, Head, Iron, Smoke, Sparks, Torso } from './Workbench'

type Tool = 'iron' | 'keys' | 'wheel'

interface Spec {
  /** Places Tek (drawn in his own 480 x 340 frame) into the 640 x 360 scene. */
  pose: { tx: number; ty: number; s: number }
  hold: Point
  tip: Point
  tool: Tool
  /** Moves the part within the set. */
  shift?: Point
  focus: Point
  /** Scan beam target area [x, y, w, h]. */
  scan: [number, number, number, number]
  grade: string
  strength: number
  vignette: string
  Back: ComponentType<SceneProps>
  Furniture: ComponentType<SceneProps>
  Part: ComponentType<SceneProps>
  Front?: ComponentType<SceneProps>
}

const SPECS: Record<MissionId, Spec> = {
  battery: {
    pose: { tx: 329, ty: 80, s: 0.6 }, hold: { x: 420, y: 222 }, tip: { x: 480, y: 214 }, tool: 'iron', shift: { x: 57, y: 0 },
    focus: { x: 455, y: 176 }, scan: [380, 200, 170, 64], grade: '#FFB24A', strength: 0.22, vignette: '#0A0603',
    Back: Sets.BatteryBack, Furniture: Sets.BatteryDesk, Part: Sets.BatteryPart,
  },
  circuit: {
    pose: { tx: 354, ty: 69, s: 0.6 }, hold: { x: 482, y: 276 }, tip: { x: 520, y: 268 }, tool: 'iron',
    focus: { x: 420, y: 220 }, scan: [270, 244, 300, 84], grade: '#CFE3FF', strength: 0.28, vignette: '#22324F',
    Back: Sets.CircuitBack, Furniture: Sets.CircuitTable, Part: Sets.CircuitPart,
  },
  code: {
    pose: { tx: 339, ty: 99, s: 0.6 }, hold: { x: 470, y: 266 }, tip: { x: 525, y: 262 }, tool: 'keys',
    focus: { x: 355, y: 100 }, scan: [276, 124, 158, 130], grade: '#2AFF9A', strength: 0.2, vignette: '#020805',
    Back: Sets.CodeBack, Furniture: Sets.CodeDesk, Part: Sets.CodePart,
  },
  comms: {
    pose: { tx: 369, ty: 93, s: 0.6 }, hold: { x: 488, y: 262 }, tip: { x: 512, y: 252 }, tool: 'iron',
    focus: { x: 300, y: 90 }, scan: [214, 100, 300, 170], grade: '#FF4FB8', strength: 0.2, vignette: '#07030F',
    Back: Sets.CommsBack, Furniture: Sets.CommsRail, Part: Sets.CommsPart, Front: Sets.CommsRain,
  },
  shutdown: {
    pose: { tx: 259, ty: 105, s: 0.6 }, hold: { x: 402, y: 258 }, tip: { x: 498, y: 256 }, tool: 'wheel',
    focus: { x: 350, y: 120 }, scan: [380, 240, 140, 60], grade: '#FF3B3B', strength: 0.3, vignette: '#0C0204',
    Back: Sets.ReactorBack, Furniture: Sets.ReactorConsole, Part: Sets.ReactorPart, Front: Sets.Embers,
  },
}

// Tek's own frame (shared with the Workshop scene).
const LEFT_SHOULDER = { x: 278, y: 206 }
const RIGHT_SHOULDER = { x: 368, y: 210 }
const REST_HAND = { x: 334, y: 264 }

interface Props {
  mission: MissionId
  mode: BenchMode
  progress: number
  hits?: number
  slips?: number
  lastEvent?: 'hit' | 'slip'
  width?: number
  detail?: 'full' | 'card'
  /** 'cover' fills its container (cropping top and bottom if needed). */
  fit?: 'width' | 'cover'
  label?: string
}

export function MissionScene({ mission, mode, progress, hits = 0, slips = 0, lastEvent = 'hit', width = 640, detail = 'full', fit = 'width', label }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id: Id = (name) => `${uid}-${name}`
  const spec = SPECS[mission]
  const p = mode === 'celebrate' ? 1 : Math.max(0, Math.min(1, progress))
  const slipping = mode === 'weld' && lastEvent === 'slip' && slips > 0
  const props: SceneProps = { id, p, mode, hits, slipping, full: detail === 'full' }
  const { Back, Furniture, Part, Front } = spec
  const { tx, ty, s } = spec.pose
  const [sx, sy, sw, sh] = spec.scan
  const goggle = { x: tx + 322 * s, y: ty + 120 * s }
  const reactorCalm = mission === 'shutdown' && mode === 'celebrate'

  return (
    <svg
      className={`bench-scene mission-scene ms-${mission} bench-${mode} detail-${detail}`}
      viewBox="0 0 640 360"
      {...(fit === 'cover' ? { preserveAspectRatio: 'xMidYMid slice', width: '100%', height: '100%' } : { width, height: (width * 9) / 16 })}
      role="img"
      aria-label={label ?? 'Tek repairing a part'}
    >
      <Defs id={id} p={p} vignette={spec.vignette} />
      <defs>
        <filter id={id('far-ms')} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.55" />
        </filter>
      </defs>
      {PAINTED[mission] ? (
        // Painted background art, with a slow camera drift so the room feels alive.
        <g className="painted-bg">
          <image href={PAINTED[mission]} x={0} y={0} width={640} height={360} preserveAspectRatio="xMidYMid slice" />
        </g>
      ) : (
        <g filter={`url(#${id('far-ms')})`}>
          <Back {...props} />
        </g>
      )}
      <TekBody id={id} pose={spec.pose} mode={mode} slipping={slipping} />
      <Furniture {...props} />
      <g transform={spec.shift ? `translate(${spec.shift.x} ${spec.shift.y})` : undefined}>
        <Part {...props} />
      </g>
      {mode === 'scan' && (
        <g className="scan">
          <polygon points={`${goggle.x},${goggle.y} ${sx},${sy} ${sx},${sy + sh} ${sx + sw},${sy + sh}`} fill={`url(#${id('beam')})`} className="scan-cone" style={{ transformOrigin: `${goggle.x}px ${goggle.y}px` }} />
          <line x1={sx} x2={sx + sw} y1={sy} y2={sy} stroke="#7FF0FF" strokeWidth="2" className="scan-line-ms" style={{ ['--scan-h' as string]: `${sh}px` }} />
        </g>
      )}
      <TekArms id={id} spec={spec} mode={mode} hits={hits} slips={slips} slipping={slipping} />
      {Front && <Front {...props} />}
      {mode === 'celebrate' && (
        <g className="holo-check">
          <circle cx={spec.focus.x} cy={spec.focus.y} r={24} fill="#54E6A5" fillOpacity="0.14" stroke="#54E6A5" strokeWidth="3" />
          <path d={`M${spec.focus.x - 11} ${spec.focus.y} l8 8 l15 -16`} fill="none" stroke="#54E6A5" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {mode === 'fail' && <Smoke x={spec.focus.x} y={spec.focus.y + 40} big />}
      <rect width={640} height={360} fill={reactorCalm ? '#7FD4FF' : spec.grade} opacity={spec.strength} style={{ mixBlendMode: 'soft-light' }} pointerEvents="none" className={mission === 'shutdown' && !reactorCalm ? 'grade-pulse' : ''} />
      <rect width={640} height={360} fill={`url(#${id('vignette')})`} pointerEvents="none" />
    </svg>
  )
}

function TekBody({ id, pose, mode, slipping }: { id: Id; pose: Spec['pose']; mode: BenchMode; slipping: boolean }) {
  return (
    <g transform={`translate(${pose.tx} ${pose.ty}) scale(${pose.s})`}>
      <g className="tek">
        <Torso id={id} mode={mode} />
        <Head id={id} mode={mode} slipping={slipping} />
      </g>
    </g>
  )
}

function TekArms({ id, spec, mode, hits, slips, slipping }: { id: Id; spec: Spec; mode: BenchMode; hits: number; slips: number; slipping: boolean }) {
  const { tx, ty, s } = spec.pose
  const local = (q: Point) => ({ x: (q.x - tx) / s, y: (q.y - ty) / s })
  const resting = mode === 'celebrate' || mode === 'fail' || mode === 'idle'
  const working = mode === 'weld' || mode === 'demo'
  const tipL = local(spec.tip)
  const iron = spec.tool === 'iron'
  const tip = resting ? { x: REST_HAND.x - 34, y: REST_HAND.y + 20 } : tipL
  const rightHand = resting ? REST_HAND : iron ? { x: tip.x + 36, y: tip.y - 24 } : tip
  const leftHand = mode === 'celebrate' ? { x: 232, y: 168 } : local(spec.hold)
  const grip = spec.tool !== 'iron' && !resting
  const rElbow = solveElbow(RIGHT_SHOULDER, rightHand, 82, 78, grip ? 'right' : 'low')
  const lElbow = solveElbow(LEFT_SHOULDER, leftHand, 80, 78, grip ? 'left' : 'low')
  const armKey = mode === 'weld' ? `${hits}-${slips}` : mode
  return (
    <g transform={`translate(${tx} ${ty}) scale(${s})`}>
      <Arm id={id} shoulder={LEFT_SHOULDER} elbowAt={lElbow} hand={leftHand} />
      <g key={armKey} className={`arm-right ${mode === 'weld' ? (slipping ? 'slip' : hits ? 'tap' : '') : ''} ${mode === 'demo' && !iron ? 'typing' : ''}`}>
        <Arm id={id} shoulder={RIGHT_SHOULDER} elbowAt={rElbow} hand={rightHand} />
        {iron && <Iron from={rightHand} to={tip} />}
        {iron && working && <circle cx={tip.x} cy={tip.y} r={14} fill={`url(#${id('torch')})`} className="torch" />}
        {iron && working && <Sparks key={`s${hits}`} x={tip.x} y={tip.y} seed={hits} loop={mode === 'demo'} />}
        {spec.tool === 'keys' && mode === 'weld' && hits > 0 && <circle key={`k${hits}`} cx={rightHand.x} cy={rightHand.y + 10} r={10} fill="#2AFF9A" className="key-flash" />}
        {spec.tool === 'wheel' && working && <Sparks key={`w${hits}`} x={tipL.x - 30} y={tipL.y + 30} seed={hits} loop={mode === 'demo'} />}
        {slipping && <Smoke x={tip.x} y={tip.y} />}
      </g>
    </g>
  )
}
