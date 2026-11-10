// Workshop scene: Tek, the goggle-eyed technician robot, repairs the part each
// mission is about (vision Sections 4 and 6.3). All artwork is original SVG.
// `progress` (0-1) drives how repaired the part looks; `hits` and `slips`
// trigger a weld spark or a tool slip on every keystroke.
//
// Layers, back to front: far wall (window onto the 2089 city, shelves, rack;
// blurred for depth of field) -> lamp light -> Tek -> bench and work mat ->
// the part -> Tek's arms and tool -> effects -> vignette.

import { useId } from 'react'
import type { MissionId } from '../data/missions'

export type BenchMode = 'idle' | 'scan' | 'weld' | 'demo' | 'celebrate' | 'fail'

interface Props {
  mission: MissionId
  mode: BenchMode
  progress: number
  hits?: number
  slips?: number
  lastEvent?: 'hit' | 'slip'
  width?: number
  /** 'card' drops small decorative details for thumbnails. */
  detail?: 'full' | 'card'
  label?: string
}

type Point = { x: number; y: number }
type Id = (name: string) => string

// Where Tek's soldering iron touches, and where the other hand holds, per part.
const RIG: Record<MissionId, { tip: Point; hold: Point }> = {
  battery: { tip: { x: 250, y: 214 }, hold: { x: 156, y: 236 } },
  circuit: { tip: { x: 198, y: 280 }, hold: { x: 112, y: 286 } },
  code: { tip: { x: 270, y: 232 }, hold: { x: 144, y: 244 } },
  comms: { tip: { x: 232, y: 278 }, hold: { x: 154, y: 272 } },
  shutdown: { tip: { x: 248, y: 284 }, hold: { x: 156, y: 252 } },
}
const LEFT_SHOULDER = { x: 278, y: 206 }
const RIGHT_SHOULDER = { x: 368, y: 210 }
const REST_HAND = { x: 334, y: 264 }

/** Two-segment inverse kinematics; of the two elbow solutions, keep the lower one. */
function elbow(shoulder: Point, hand: Point, upper: number, fore: number): Point {
  const dx = hand.x - shoulder.x
  const dy = hand.y - shoulder.y
  const d = Math.min(Math.hypot(dx, dy), upper + fore - 0.01)
  const a = (upper * upper - fore * fore + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, upper * upper - a * a))
  const ux = dx / d
  const uy = dy / d
  const mx = shoulder.x + ux * a
  const my = shoulder.y + uy * a
  const p1 = { x: mx - uy * h, y: my + ux * h }
  const p2 = { x: mx + uy * h, y: my - ux * h }
  return p1.y >= p2.y ? p1 : p2
}

export function Workbench({ mission, mode, progress, hits = 0, slips = 0, lastEvent = 'hit', width = 440, detail = 'full', label }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id: Id = (name) => `${uid}-${name}`
  const p = mode === 'celebrate' ? 1 : Math.max(0, Math.min(1, progress))
  const working = mode === 'weld' || mode === 'demo'
  const resting = mode === 'celebrate' || mode === 'fail' || mode === 'idle'
  const slipping = mode === 'weld' && lastEvent === 'slip' && slips > 0
  const rig = RIG[mission]
  const tip = resting ? { x: REST_HAND.x - 34, y: REST_HAND.y + 20 } : rig.tip
  const rightHand = resting ? REST_HAND : { x: tip.x + 36, y: tip.y - 24 }
  const leftHand = mode === 'celebrate' ? { x: 232, y: 168 } : rig.hold
  const rElbow = elbow(RIGHT_SHOULDER, rightHand, 82, 78)
  const lElbow = elbow(LEFT_SHOULDER, leftHand, 80, 78)
  const armKey = mode === 'weld' ? `${hits}-${slips}` : mode
  const full = detail === 'full'

  return (
    <svg
      className={`bench-scene bench-${mode} detail-${detail}`}
      width={width}
      height={(width * 340) / 480}
      viewBox="0 0 480 340"
      role="img"
      aria-label={label ?? 'A technician robot repairing a part at a workbench'}
    >
      <Defs id={id} p={p} />

      {/* far layer, softly out of focus */}
      <g filter={`url(#${id('far')})`}>
        <FarWall id={id} full={full} />
      </g>
      <Lamp id={id} />
      {full && <Motes />}

      {/* Tek's soft shadow on the wall, then Tek */}
      <ellipse cx={356} cy={170} rx={92} ry={86} fill="#04050C" opacity="0.45" filter={`url(#${id('soft')})`} />
      <g className="tek">
        <Torso id={id} mode={mode} />
        <Head id={id} mode={mode} slipping={slipping} />
      </g>

      <Bench id={id} full={full} />
      <ellipse cx={204} cy={304} rx={92} ry={9} fill="#04050C" opacity="0.55" filter={`url(#${id('soft')})`} />
      <Part mission={mission} p={p} id={id} mode={mode} slipping={slipping} />

      {mode === 'scan' && (
        <g className="scan">
          <polygon points="276,150 106,168 106,306 296,306" fill={`url(#${id('beam')})`} className="scan-cone" />
          <line x1={104} x2={298} y1={0} y2={0} stroke="#7FF0FF" strokeWidth="2" className="scan-line" />
        </g>
      )}

      <Arm id={id} shoulder={LEFT_SHOULDER} elbowAt={lElbow} hand={leftHand} />
      <g key={armKey} className={`arm-right ${mode === 'weld' ? (slipping ? 'slip' : hits ? 'tap' : '') : ''}`}>
        <Arm id={id} shoulder={RIGHT_SHOULDER} elbowAt={rElbow} hand={rightHand} />
        <Iron from={rightHand} to={tip} />
        {working && <circle cx={tip.x} cy={tip.y} r={14} fill={`url(#${id('torch')})`} className="torch" />}
        {working && <Sparks key={`s${hits}`} x={tip.x} y={tip.y} seed={hits} loop={mode === 'demo'} />}
        {slipping && <Smoke x={tip.x} y={tip.y} />}
      </g>

      {mode === 'celebrate' && (
        <g className="holo-check">
          <circle cx={150} cy={112} r={26} fill="#54E6A5" fillOpacity="0.14" stroke="#54E6A5" strokeWidth="3" />
          <path d="M138 112 l9 9 l16 -18" fill="none" stroke="#54E6A5" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {mode === 'fail' && <Smoke x={204} y={196} big />}

      <rect width={480} height={340} fill={`url(#${id('vignette')})`} pointerEvents="none" />
    </svg>
  )
}

/* ------------------------------------------------------------------ defs */

function Defs({ id, p }: { id: Id; p: number }) {
  const core = coreColor(p)
  return (
    <defs>
      <filter id={id('far')} x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="1.3" />
      </filter>
      <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter id={id('bloom')} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={id('haze')} x="-30%" y="-10%" width="160%" height="130%">
        <feGaussianBlur stdDeviation="10" />
      </filter>

      <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1B1436" />
        <stop offset="100%" stopColor="#0F1028" />
      </linearGradient>
      <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#140F33" />
        <stop offset="60%" stopColor="#3A1F5C" />
        <stop offset="100%" stopColor="#B4466A" />
      </linearGradient>
      <radialGradient id={id('vignette')} cx="50%" cy="48%" r="70%">
        <stop offset="60%" stopColor="#05060F" stopOpacity="0" />
        <stop offset="100%" stopColor="#05060F" stopOpacity="0.75" />
      </radialGradient>
      <linearGradient id={id('cone')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFD89A" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#FFCA70" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id={id('wood')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6B4436" />
        <stop offset="35%" stopColor="#4A2E2C" />
        <stop offset="100%" stopColor="#211521" />
      </linearGradient>
      <radialGradient id={id('pool')} cx="50%" cy="35%" r="55%">
        <stop offset="0%" stopColor="#FFD89A" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#FFCA70" stopOpacity="0" />
      </radialGradient>
      <pattern id={id('matgrid')} width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M12 0 H0 V12" fill="none" stroke="#3FB59A" strokeOpacity="0.25" strokeWidth="1" />
      </pattern>

      {/* Tek */}
      <radialGradient id={id('dome')} cx="32%" cy="22%" r="85%">
        <stop offset="0%" stopColor="#E4E0FF" />
        <stop offset="40%" stopColor="#9D97D4" />
        <stop offset="100%" stopColor="#3A3563" />
      </radialGradient>
      <linearGradient id={id('torso')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ADA7E0" />
        <stop offset="100%" stopColor="#3E3968" />
      </linearGradient>
      <radialGradient id={id('ball')} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#DCD8FF" />
        <stop offset="55%" stopColor="#7C76B4" />
        <stop offset="100%" stopColor="#2E2A52" />
      </radialGradient>
      <linearGradient id={id('rim')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7B80A6" />
        <stop offset="50%" stopColor="#3A3F5E" />
        <stop offset="100%" stopColor="#14172A" />
      </linearGradient>
      <radialGradient id={id('lens')} cx="38%" cy="36%" r="70%">
        <stop offset="0%" stopColor="#F4FFFF" />
        <stop offset="30%" stopColor="#8BF1FF" />
        <stop offset="65%" stopColor="#36D9F5" />
        <stop offset="100%" stopColor="#0B5E73" />
      </radialGradient>
      <radialGradient id={id('torch')} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="35%" stopColor="#FFE9B8" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#FFCA70" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id('beam')} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7FF0FF" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#36D9F5" stopOpacity="0.03" />
      </linearGradient>

      {/* parts */}
      <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#4C5875" />
        <stop offset="30%" stopColor="#C9D2E6" />
        <stop offset="55%" stopColor="#8994AE" />
        <stop offset="100%" stopColor="#363F58" />
      </linearGradient>
      <linearGradient id={id('pcb')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2A7A5E" />
        <stop offset="100%" stopColor="#174A3A" />
      </linearGradient>
      <linearGradient id={id('crt')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E3DCC4" />
        <stop offset="100%" stopColor="#A89F84" />
      </linearGradient>
      <radialGradient id={id('screen')} cx="50%" cy="45%" r="65%">
        <stop offset="0%" stopColor="#0E3322" />
        <stop offset="100%" stopColor="#03100A" />
      </radialGradient>
      <pattern id={id('scanlines')} width="4" height="3" patternUnits="userSpaceOnUse">
        <rect width="4" height="1" fill="#000" opacity="0.35" />
      </pattern>
      <linearGradient id={id('glass')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#DDE4F2" stopOpacity="0.45" />
        <stop offset="25%" stopColor="#DDE4F2" stopOpacity="0.08" />
        <stop offset="80%" stopColor="#DDE4F2" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#DDE4F2" stopOpacity="0.35" />
      </linearGradient>
      <radialGradient id={id('core')} cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="45%" stopColor={core} />
        <stop offset="100%" stopColor={core} stopOpacity="0.5" />
      </radialGradient>
      <pattern id={id('hazard')} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="14" fill="#FFCA70" />
        <rect x="7" width="7" height="14" fill="#1B1F33" />
      </pattern>
      <linearGradient id={id('dish')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F2F5FB" />
        <stop offset="100%" stopColor="#7D89A6" />
      </linearGradient>
    </defs>
  )
}

/** Reactor core cools from coral red (0) through violet to electric cyan (1). */
const coreColor = (p: number) => `hsl(${Math.round(350 - p * 160)} 92% 63%)`

/* ------------------------------------------------------------- far layer */

const BUILDINGS: [number, number, number][] = [
  [22, 30, 70], [50, 22, 92], [70, 34, 58], [102, 18, 104], [118, 26, 80], [142, 30, 66], [170, 26, 88],
]

function FarWall({ id, full }: { id: Id; full: boolean }) {
  return (
    <g>
      <rect width={480} height={340} fill={`url(#${id('wall')})`} />
      {/* wall panels */}
      <g stroke="#251E45" strokeWidth="2">
        <line x1={0} x2={480} y1={168} y2={168} />
        <line x1={232} x2={232} y1={0} y2={168} />
        <line x1={398} x2={398} y1={0} y2={168} />
      </g>

      {/* window onto the 2089 city */}
      <rect x={14} y={14} width={190} height={132} rx={8} fill="#0A0C1C" />
      <rect x={20} y={20} width={178} height={120} rx={4} fill={`url(#${id('sky')})`} />
      <circle cx={162} cy={46} r={12} fill="#FFE3F0" opacity="0.85" />
      <circle cx={162} cy={46} r={22} fill="#FFB3D0" opacity="0.15" />
      {BUILDINGS.map(([x, w, h], i) => (
        <g key={x}>
          <rect x={x} y={140 - h} width={w} height={h} fill={i % 2 ? '#120E2A' : '#181338'} />
          {Array.from({ length: Math.floor(h / 14) }, (_, row) =>
            [0, 1].map((col) => ((row + col + i) % 3 === 0 ? null : (
              <rect key={`${row}-${col}`} x={x + 5 + col * (w / 2 - 2)} y={140 - h + 6 + row * 14} width={4} height={5} fill={(row + i) % 4 === 0 ? '#36D9F5' : '#FFCA70'} opacity="0.75" />
            ))),
          )}
        </g>
      ))}
      <rect x={104} y={44} width={14} height={4} rx={2} fill="#FF647C" className="neon" />
      <g className="flyer"><rect x={40} y={60} width={10} height={3} rx={1.5} fill="#7FF0FF" /><circle cx={50} cy={61.5} r={2} fill="#FFFFFF" /></g>
      {/* window frame + mullions */}
      <g fill="none" stroke="#2F2856" strokeWidth="4">
        <rect x={18} y={18} width={182} height={124} rx={5} />
        <line x1={109} x2={109} y1={18} y2={142} />
        <line x1={18} x2={200} y1={80} y2={80} />
      </g>
      <rect x={10} y={142} width={198} height={8} rx={2} fill="#2A2350" />

      {/* steam pipes */}
      <rect x={210} y={4} width={270} height={9} rx={4} fill="#2C2650" />
      <rect x={262} y={1} width={8} height={15} rx={2} fill="#3B3468" />
      <rect x={420} y={1} width={8} height={15} rx={2} fill="#3B3468" />

      {/* shelf with spare robot parts and jars */}
      <rect x={14} y={194} width={200} height={6} rx={2} fill="#2A2350" />
      <rect x={24} y={156} width={30} height={38} rx={6} fill="#24405E" />
      <rect x={24} y={168} width={30} height={10} fill="#FFCA70" opacity="0.55" />
      <rect x={30} y={150} width={18} height={8} rx={2} fill="#3B3468" />
      <g opacity="0.9">
        <ellipse cx={86} cy={178} rx={20} ry={16} fill="#4A4578" />
        <circle cx={79} cy={182} r={6} fill="#141729" />
        <circle cx={94} cy={182} r={6} fill="#141729" />
        <circle cx={79} cy={182} r={3} fill="#36D9F5" opacity="0.35" />
      </g>
      <path d="M124 194 l8 -26 l14 0 l4 10 l20 4 l0 12z" fill="#3B3468" />
      {full && <rect x={176} y={170} width={30} height={24} rx={3} fill="#2D2550" />}

      {/* server rack with a monitor and speakers */}
      <rect x={404} y={34} width={68} height={214} rx={6} fill="#151829" stroke="#2A3050" strokeWidth="2" />
      <rect x={410} y={42} width={56} height={34} rx={4} fill="#06121A" stroke="#2A3A58" />
      <polyline points="414,62 422,58 428,66 434,50 440,64 446,56 452,60 460,54" fill="none" stroke="#36D9F5" strokeWidth="2" className="wave" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={414 + (i % 3) * 16} y={84 + Math.floor(i / 3) * 9} width={10} height={4} rx={1} fill={['#54E6A5', '#FF647C', '#FFCA70', '#36D9F5', '#54E6A5', '#A78BFA'][i]} className="led" style={{ animationDelay: `${i * 0.37}s` }} />
      ))}
      <circle cx={438} cy={134} r={21} fill="#0C0E1C" stroke="#2A3050" strokeWidth="5" />
      <circle cx={438} cy={134} r={7} fill="#2A3050" />
      <circle cx={438} cy={200} r={25} fill="#0C0E1C" stroke="#2A3050" strokeWidth="5" />
      <circle cx={438} cy={200} r={8} fill="#2A3050" />

      {/* hanging cables */}
      <path d="M236 13 C 226 60 262 80 250 128" fill="none" stroke="#2C2650" strokeWidth="3" />
      <path d="M386 13 C 398 60 364 92 392 150" fill="none" stroke="#2C2650" strokeWidth="3" />

      {/* bokeh */}
      <circle cx={250} cy={36} r={16} fill="#FFCA70" opacity="0.14" />
      <circle cx={300} cy={22} r={10} fill="#FF647C" opacity="0.16" />
      <circle cx={386} cy={44} r={12} fill="#36D9F5" opacity="0.12" />
    </g>
  )
}

function Lamp({ id }: { id: Id }) {
  return (
    <g className="lamp">
      <polygon points="186,58 228,58 336,250 70,250" fill={`url(#${id('cone')})`} filter={`url(#${id('haze')})`} opacity="0.55" className="lamp-cone" />
      <line x1={207} y1={0} x2={207} y2={40} stroke="#2C2650" strokeWidth="2.5" />
      <path d="M190 40 h34 l14 18 h-62z" fill="#3E3670" stroke="#221C44" strokeWidth="2" />
      <path d="M194 42 h12 l-6 14 h-12z" fill="#5C54A0" opacity="0.6" />
      <ellipse cx={207} cy={59} rx={13} ry={4} fill="#FFF1CF" filter={`url(#${id('bloom')})`} />
    </g>
  )
}

function Motes() {
  const motes = [[150, 120], [182, 160], [220, 140], [130, 200], [250, 190], [205, 96], [170, 222]]
  return (
    <g className="motes">
      {motes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1.1} fill="#FFE9B8" style={{ animationDelay: `${i * 0.7}s` }} />)}
    </g>
  )
}

/* ------------------------------------------------------------------- bench */

function Bench({ id, full }: { id: Id; full: boolean }) {
  return (
    <g>
      <polygon points="0,246 480,246 480,340 0,340" fill={`url(#${id('wood')})`} />
      <g stroke="#2A1A22" strokeOpacity="0.55" strokeWidth="1.5">
        <line x1={0} x2={480} y1={268} y2={268} />
        <line x1={0} x2={480} y1={296} y2={296} />
        <line x1={0} x2={480} y1={326} y2={326} />
      </g>
      <line x1={0} x2={480} y1={246.5} y2={246.5} stroke="#FFD89A" strokeOpacity="0.45" strokeWidth="2" />
      {/* work mat */}
      <polygon points="84,256 318,256 334,318 66,318" fill="#123E38" stroke="#2F8C76" strokeWidth="1.5" />
      <polygon points="84,256 318,256 334,318 66,318" fill={`url(#${id('matgrid')})`} />
      <ellipse cx={206} cy={286} rx={200} ry={56} fill={`url(#${id('pool')})`} className="lamp-pool" />
      {full && <Clutter />}
    </g>
  )
}

function Clutter() {
  return (
    <g className="clutter">
      <g fill="none" stroke="#2B2442" strokeWidth="4">
        <ellipse cx={38} cy={300} rx={30} ry={11} />
        <ellipse cx={38} cy={296} rx={24} ry={8} />
        <ellipse cx={38} cy={292} rx={18} ry={6} />
      </g>
      {/* screwdriver */}
      <rect x={110} y={324} width={52} height={9} rx={4} fill="#FF647C" transform="rotate(-6 110 324)" />
      <rect x={160} y={319} width={40} height={3.5} rx={1.5} fill="#C9D2E6" transform="rotate(-6 160 319)" />
      {/* nuts and bolts */}
      <polygon points="352,318 358,314 364,318 364,324 358,328 352,324" fill="#8994AE" stroke="#363F58" />
      <circle cx={358} cy={321} r={2} fill="#363F58" />
      <polygon points="372,328 377,325 382,328 382,333 377,336 372,333" fill="#8994AE" stroke="#363F58" />
      {/* solder spool */}
      <ellipse cx={396} cy={300} rx={15} ry={5.5} fill="#3B3468" />
      <rect x={381} y={282} width={30} height={18} fill="#C9D2E6" opacity="0.8" />
      <ellipse cx={396} cy={282} rx={15} ry={5.5} fill="#8C86C0" />
      {/* coffee mug with steam */}
      <rect x={428} y={276} width={30} height={30} rx={5} fill="#FF647C" />
      <rect x={428} y={276} width={10} height={30} rx={4} fill="#FFFFFF" opacity="0.18" />
      <path d="M458 283 q12 0 12 9 q0 9 -12 9" fill="none" stroke="#FF647C" strokeWidth="4" />
      <ellipse cx={443} cy={277} rx={15} ry={4} fill="#3A2420" />
      <path d="M438 268 q-6 -8 0 -16 q6 -8 0 -16" fill="none" stroke="#E8E6F5" strokeWidth="2" strokeLinecap="round" className="steam" />
      <path d="M448 270 q-6 -8 0 -16 q6 -8 0 -16" fill="none" stroke="#E8E6F5" strokeWidth="2" strokeLinecap="round" className="steam s2" />
    </g>
  )
}

/* --------------------------------------------------------------------- Tek */

function Torso({ id, mode }: { id: Id; mode: BenchMode }) {
  const core = mode === 'fail' ? '#FFCA70' : mode === 'celebrate' ? '#54E6A5' : '#36D9F5'
  return (
    <g>
      <rect x={304} y={164} width={30} height={24} rx={6} fill="#2A2547" />
      <path d="M270 198 Q264 184 280 182 L366 182 Q382 184 376 198 L386 262 Q386 278 370 278 L276 278 Q260 278 260 262 Z" fill={`url(#${id('torso')})`} stroke="#221D3D" strokeWidth="3" />
      <path d="M278 190 Q300 186 320 186" fill="none" stroke="#E4E0FF" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <rect x={296} y={196} width={56} height={42} rx={11} fill="#2E2A52" stroke="#1C1838" strokeWidth="2" />
      <circle cx={324} cy={217} r={9} fill={core} filter={`url(#${id('bloom')})`} className="chest-light" />
      <circle cx={321} cy={214} r={3} fill="#FFFFFF" opacity="0.8" />
      <g stroke="#1C1838" strokeWidth="2.5" strokeLinecap="round">
        <line x1={302} x2={312} y1={232} y2={232} />
        <line x1={336} x2={346} y1={232} y2={232} />
      </g>
    </g>
  )
}

function Head({ id, mode, slipping }: { id: Id; mode: BenchMode; slipping: boolean }) {
  const happy = mode === 'celebrate'
  const sad = mode === 'fail'
  const lamp = sad ? '#FFCA70' : '#36D9F5'
  return (
    <g className="tek-head">
      {/* antennas */}
      <path d="M296 56 C 284 34 266 30 256 14" fill="none" stroke="#9D97D4" strokeWidth="3" strokeLinecap="round" />
      <path d="M342 56 C 354 32 376 28 386 12" fill="none" stroke="#9D97D4" strokeWidth="3" strokeLinecap="round" />
      <circle cx={256} cy={13} r={4.5} fill="#FFCA70" filter={`url(#${id('bloom')})`} className="tip-glow" />
      <circle cx={386} cy={11} r={4.5} fill="#36D9F5" filter={`url(#${id('bloom')})`} className="tip-glow t2" />

      {/* dome */}
      <ellipse cx={318} cy={110} rx={78} ry={64} fill={`url(#${id('dome')})`} stroke="#221D3D" strokeWidth="3" />
      <path d="M246 112 Q318 88 390 112" fill="none" stroke="#2E2952" strokeWidth="2.5" />
      <path d="M318 47 L318 98" stroke="#2E2952" strokeWidth="2" />
      <ellipse cx={286} cy={70} rx={24} ry={11} fill="#FFFFFF" opacity="0.45" transform="rotate(-24 286 70)" />
      <ellipse cx={268} cy={88} rx={5} ry={3} fill="#FFFFFF" opacity="0.4" />
      {[[296, 92], [342, 92], [364, 72], [302, 64], [374, 100], [262, 106]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r={3.6} fill="#3A3563" />
          <circle cx={x - 1} cy={y - 1} r={1.3} fill="#D9D4FF" opacity="0.8" />
        </g>
      ))}

      {/* side lamp */}
      <circle cx={392} cy={122} r={19} fill={`url(#${id('rim')})`} stroke="#14172A" strokeWidth="2" />
      <circle cx={392} cy={122} r={11} fill={lamp} filter={`url(#${id('bloom')})`} className="side-lamp" />
      <circle cx={389} cy={119} r={3} fill="#FFFFFF" opacity="0.8" />

      {/* goggles */}
      <rect x={278} y={136} width={42} height={12} rx={3} fill="#14172A" />
      <Goggle id={id} cx={278} cy={140} r={25} happy={happy} sad={sad} slipping={slipping} />
      <Goggle id={id} cx={342} cy={146} r={23} happy={happy} sad={sad} slipping={slipping} />
    </g>
  )
}

function Goggle({ id, cx, cy, r, happy, sad, slipping }: { id: Id; cx: number; cy: number; r: number; happy: boolean; sad: boolean; slipping: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 9} fill={`url(#${id('rim')})`} stroke="#0E1020" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r + 2} fill="#070912" />
      {!sad && <circle cx={cx} cy={cy} r={r} fill="#36D9F5" opacity="0.55" filter={`url(#${id('bloom')})`} />}
      <circle cx={cx} cy={cy} r={r} fill={sad ? '#6E5326' : `url(#${id('lens')})`} className="lens" />
      <circle cx={cx} cy={cy} r={r * 0.7} fill="none" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1.5" />
      {slipping && <circle cx={cx} cy={cy} r={r} fill="#FF647C" opacity="0.6" className="lens-alarm" />}
      {happy ? (
        <path d={`M${cx - r * 0.5} ${cy + 4} q${r * 0.5} -${r * 0.75} ${r} 0`} fill="none" stroke="#06303A" strokeWidth="4.5" strokeLinecap="round" />
      ) : sad ? (
        <rect x={cx - r - 1} y={cy - r - 1} width={r * 2 + 2} height={r + 2} fill="#14172A" />
      ) : (
        <>
          <circle cx={cx - r * 0.22} cy={cy + r * 0.22} r={r * 0.26} fill="#063A47" />
          <circle cx={cx - r * 0.3} cy={cy + r * 0.14} r={r * 0.08} fill="#FFFFFF" opacity="0.9" />
        </>
      )}
      <path d={`M${cx - r * 0.72} ${cy - r * 0.15} A ${r * 0.75} ${r * 0.75} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.72}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Arm({ id, shoulder, elbowAt, hand }: { id: Id; shoulder: Point; elbowAt: Point; hand: Point }) {
  const path = `M${shoulder.x} ${shoulder.y} L${elbowAt.x} ${elbowAt.y} L${hand.x} ${hand.y}`
  const hl = `M${shoulder.x - 1.5} ${shoulder.y - 2.5} L${elbowAt.x - 1.5} ${elbowAt.y - 2.5} L${hand.x - 1.5} ${hand.y - 2.5}`
  const angle = (Math.atan2(hand.y - elbowAt.y, hand.x - elbowAt.x) * 180) / Math.PI
  return (
    <g className="tek-arm">
      <path d={path} fill="none" stroke="#1C1838" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="#6A64A0" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d={hl} fill="none" stroke="#C4BEF0" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <circle cx={shoulder.x} cy={shoulder.y} r={13} fill={`url(#${id('ball')})`} stroke="#1C1838" strokeWidth="2" />
      <circle cx={elbowAt.x} cy={elbowAt.y} r={10} fill={`url(#${id('ball')})`} stroke="#1C1838" strokeWidth="2" />
      <g transform={`translate(${hand.x} ${hand.y}) rotate(${angle})`}>
        <rect x={4} y={-9} width={15} height={6} rx={3} fill="#7C76B4" stroke="#1C1838" strokeWidth="1.5" />
        <rect x={6} y={-2.5} width={16} height={6} rx={3} fill="#7C76B4" stroke="#1C1838" strokeWidth="1.5" />
        <rect x={3} y={4} width={13} height={6} rx={3} fill="#7C76B4" stroke="#1C1838" strokeWidth="1.5" />
        <circle r={11} fill={`url(#${id('ball')})`} stroke="#1C1838" strokeWidth="2" />
      </g>
    </g>
  )
}

function Iron({ from, to }: { from: Point; to: Point }) {
  const mid = { x: from.x + (to.x - from.x) * 0.58, y: from.y + (to.y - from.y) * 0.58 }
  const back = { x: from.x - (to.x - from.x) * 0.18, y: from.y - (to.y - from.y) * 0.18 }
  return (
    <g className="iron">
      <line x1={back.x} y1={back.y} x2={mid.x} y2={mid.y} stroke="#1C1838" strokeWidth="11" strokeLinecap="round" />
      <line x1={back.x} y1={back.y} x2={mid.x} y2={mid.y} stroke="#E0A84A" strokeWidth="8" strokeLinecap="round" />
      <line x1={back.x} y1={back.y} x2={mid.x} y2={mid.y} stroke="#9C6B22" strokeWidth="8" strokeDasharray="2 5" />
      <line x1={mid.x} y1={mid.y} x2={to.x} y2={to.y} stroke="#C9D2E6" strokeWidth="3.5" strokeLinecap="round" />
    </g>
  )
}

/* ------------------------------------------------------------------- parts */

function Part({ mission, p, id, mode, slipping }: { mission: MissionId; p: number; id: Id; mode: BenchMode; slipping: boolean }) {
  const bloom = `url(#${id('bloom')})`
  switch (mission) {
    case 'battery': {
      const lit = Math.ceil(p * 5 - 0.001)
      const color = p < 0.4 ? '#FF647C' : p < 0.75 ? '#FFCA70' : '#54E6A5'
      return (
        <g className="part">
          {/* clip leads */}
          <path d="M186 170 C 150 176 110 214 92 258" fill="none" stroke="#FF647C" strokeWidth="3.5" />
          <path d="M218 170 C 262 168 270 210 300 256" fill="none" stroke="#2A2547" strokeWidth="3.5" />
          <rect x={86} y={254} width={14} height={8} rx={2} fill="#FF647C" />
          {/* cell */}
          <rect x={160} y={168} width={86} height={130} rx={18} fill={`url(#${id('metal')})`} stroke="#252C44" strokeWidth="3" />
          <rect x={160} y={186} width={86} height={14} fill="#A78BFA" opacity="0.55" />
          <rect x={186} y={154} width={34} height={16} rx={5} fill="#9AA5BD" stroke="#252C44" strokeWidth="2" />
          <path d="M198 162 h10 M203 157 v10" stroke="#252C44" strokeWidth="2.5" strokeLinecap="round" />
          <rect x={176} y={206} width={54} height={78} rx={9} fill="#070B16" stroke="#252C44" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={182} y={270 - i * 15} width={42} height={11} rx={3} fill={i < lit ? color : '#18213A'} filter={i < lit ? bloom : undefined} className={i < lit ? 'cell-on' : ''} />
          ))}
          {lit === 0 && <path d="M207 222 l-10 20 h10 l-6 18 l16 -24 h-10 l6 -14z" fill="#FF647C" filter={bloom} className="empty-bolt" />}
          <rect x={166} y={176} width={8} height={110} rx={4} fill="#FFFFFF" opacity="0.25" />
          <rect x={244} y={204} width={10} height={22} rx={2} fill="#14172A" stroke="#C9D2E6" strokeWidth="1.5" />
          {(mode === 'weld' || mode === 'demo') && (
            <path d="M190 152 l-8 -7 l6 -2 l-8 -9 M216 152 l8 -7 l-6 -2 l8 -9" fill="none" stroke="#9FF6FF" strokeWidth="2.2" filter={bloom} className="arc" />
          )}
        </g>
      )
    }
    case 'circuit': {
      const traces = ['M110 296 H146 L156 286', 'M188 282 H210', 'M238 288 H266 L278 300', 'M168 270 L178 262 H238', 'M250 268 H266 L274 280', 'M132 274 H150']
      return (
        <g className="part">
          <polygon points="88,304 304,304 304,312 88,312" fill="#0E2E24" />
          <polygon points="106,258 286,258 304,304 88,304" fill={`url(#${id('pcb')})`} stroke="#3AA383" strokeWidth="2" />
          {[[112, 300], [296, 300], [116, 264], [278, 264]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r={3} fill="#0E2E24" stroke="#E0A84A" strokeWidth="1.5" />)}
          {traces.map((d) => <path key={d} d={d} fill="none" stroke="#2E6E57" strokeWidth="3.2" strokeLinecap="round" />)}
          {traces.map((d) => (
            <path key={`lit-${d}`} d={d} pathLength={100} fill="none" stroke="#7FF0FF" strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${p * 100} 100`} filter={bloom} className="trace-lit" />
          ))}
          {/* chips with pins */}
          {[[150, 272, 38, 20], [210, 276, 30, 22]].map(([x, y, w, h]) => (
            <g key={x}>
              {Array.from({ length: Math.floor(w / 6) }, (_, i) => (
                <g key={i} stroke="#C9D2E6" strokeWidth="1.5">
                  <line x1={x + 4 + i * 6} x2={x + 4 + i * 6} y1={y - 3} y2={y} />
                  <line x1={x + 4 + i * 6} x2={x + 4 + i * 6} y1={y + h} y2={y + h + 3} />
                </g>
              ))}
              <rect x={x} y={y} width={w} height={h} rx={2} fill="#151A26" stroke="#3A4560" />
              <rect x={x + 3} y={y + 3} width={w * 0.4} height={2} fill="#5A6684" />
            </g>
          ))}
          <rect x={250} y={240} width={12} height={22} rx={4} fill="#A78BFA" />
          <ellipse cx={256} cy={240} rx={6} ry={2.5} fill="#D9CCFF" />
          <rect x={128} y={248} width={10} height={18} rx={4} fill="#FFCA70" />
          <ellipse cx={133} cy={248} rx={5} ry={2} fill="#FFE3A3" />
          <g transform="translate(176 296)">
            <rect width={18} height={6} rx={3} fill="#D7C39A" />
            <rect x={4} width={2} height={6} fill="#FF647C" />
            <rect x={9} width={2} height={6} fill="#14172A" />
            <rect x={13} width={2} height={6} fill="#E0A84A" />
          </g>
          <circle cx={268} cy={292} r={4} fill={p > 0.95 ? '#54E6A5' : '#FF647C'} filter={bloom} className="status-led" />
          {(mode === 'weld' || mode === 'demo') && <path d="M198 272 q-5 -10 0 -18 q5 -8 0 -16" fill="none" stroke="#E8E6F5" strokeOpacity="0.5" strokeWidth="2" className="steam" />}
        </g>
      )
    }
    case 'code': {
      const lines = Math.floor(p * 7)
      const widths = [72, 50, 82, 44, 66, 58, 76]
      const colors = ['#54E6A5', '#7FF0FF', '#54E6A5', '#FFCA70', '#54E6A5', '#A78BFA', '#54E6A5']
      return (
        <g className="part">
          {/* keyboard */}
          <polygon points="150,300 254,300 262,312 142,312" fill="#BDB49A" stroke="#7E765E" />
          {Array.from({ length: 9 }, (_, i) => <rect key={i} x={152 + i * 11} y={302} width={8} height={4} rx={1} fill="#8E8670" />)}
          <rect x={180} y={280} width={46} height={16} rx={3} fill="#8E8670" />
          {/* CRT */}
          <rect x={136} y={164} width={134} height={120} rx={16} fill={`url(#${id('crt')})`} stroke="#6E6650" strokeWidth="3" />
          <rect x={148} y={176} width={110} height={84} rx={12} fill={`url(#${id('screen')})`} stroke="#3B3628" strokeWidth="3" />
          <g filter={bloom}>
            {widths.slice(0, lines).map((w, i) => (
              <rect key={i} x={158 + (i % 3 === 1 ? 8 : 0)} y={186 + i * 9.5} width={w} height={4} rx={1} fill={colors[i]} opacity={0.85} />
            ))}
            {lines < 7 && <rect x={158} y={186 + lines * 9.5} width={7} height={6} fill="#54E6A5" className="cursor" />}
          </g>
          <rect x={148} y={176} width={110} height={84} rx={12} fill={`url(#${id('scanlines')})`} />
          {mode !== 'celebrate' && p < 1 && <rect x={148} y={176} width={110} height={84} rx={12} fill="#FF647C" opacity={slipping ? 0.38 : 0.05} className="crt-glitch" />}
          <path d="M156 182 Q200 176 248 182" fill="none" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="3" />
          <circle cx={240} cy={272} r={4} fill="#8E8670" />
          <circle cx={252} cy={272} r={4} fill="#8E8670" />
          <circle cx={152} cy={272} r={3.5} fill={p > 0.95 ? '#54E6A5' : '#FFCA70'} filter={bloom} />
          {/* open service hatch */}
          <rect x={266} y={196} width={12} height={62} rx={2} fill="#3B3628" />
          <path d="M270 210 q9 10 0 20 M270 236 q7 8 0 14" fill="none" stroke="#FF647C" strokeWidth="2" />
        </g>
      )
    }
    case 'comms': {
      const lit = mode === 'celebrate' ? 4 : Math.floor(p * 4)
      return (
        <g className="part">
          <rect x={148} y={262} width={110} height={40} rx={7} fill={`url(#${id('metal')})`} stroke="#252C44" strokeWidth="2" />
          {[0, 1, 2].map((i) => <circle key={i} cx={164 + i * 13} cy={282} r={3.5} fill={i < lit ? '#54E6A5' : '#18213A'} filter={i < lit ? bloom : undefined} />)}
          <g stroke="#363F58" strokeWidth="2">
            {[0, 1, 2, 3].map((i) => <line key={i} x1={212 + i * 8} x2={212 + i * 8} y1={272} y2={292} />)}
          </g>
          <rect x={198} y={214} width={12} height={50} fill="#4A5571" />
          <rect x={198} y={214} width={4} height={50} fill="#9AA5BD" opacity="0.5" />
          <ellipse cx={204} cy={198} rx={48} ry={21} fill={`url(#${id('dish')})`} stroke="#5D6A88" strokeWidth="2" transform="rotate(25 204 198)" />
          <ellipse cx={204} cy={198} rx={36} ry={14} fill="#AEB8CE" transform="rotate(25 204 198)" />
          <line x1={204} y1={198} x2={174} y2={168} stroke="#4A5571" strokeWidth="3.5" />
          <circle cx={174} cy={168} r={5} fill={lit ? '#7FF0FF' : '#6B7A99'} filter={lit ? bloom : undefined} />
          {[14, 25, 36, 47].map((r, i) => (
            <path key={r} d={`M${174 - r * 0.42} ${168 - r * 0.9} A ${r} ${r} 0 0 0 ${174 - r * 0.95} ${168 - r * 0.3}`} fill="none" stroke={i < lit ? '#7FF0FF' : '#2A3050'} strokeWidth="3.2" strokeLinecap="round" filter={i < lit ? bloom : undefined} className={i < lit ? 'wave-on' : ''} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </g>
      )
    }
    case 'shutdown':
      return (
        <g className="part">
          {/* coolant pipes */}
          <path d="M168 214 H140 V292" fill="none" stroke="#4A5571" strokeWidth="7" />
          <path d="M236 214 H262 V270" fill="none" stroke="#4A5571" strokeWidth="7" />
          <rect x={148} y={270} width={110} height={30} rx={6} fill={`url(#${id('hazard')})`} stroke="#252C44" strokeWidth="2" />
          <rect x={166} y={162} width={72} height={110} rx={32} fill="#070912" />
          <rect x={184} y={180} width={36} height={76} rx={18} fill={`url(#${id('core')})`} filter={bloom} className={p < 0.5 ? 'core-hot' : 'core-cool'} />
          <ellipse cx={202} cy={218} rx={14} ry={4} fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.5" className="core-swirl" />
          <rect x={166} y={162} width={72} height={110} rx={32} fill={`url(#${id('glass')})`} stroke="#7D89A6" strokeWidth="2" />
          <rect x={174} y={172} width={8} height={88} rx={4} fill="#FFFFFF" opacity="0.28" />
          <ellipse cx={202} cy={200} rx={38} ry={6} fill="none" stroke="#9AA5BD" strokeWidth="3.5" />
          <ellipse cx={202} cy={242} rx={38} ry={6} fill="none" stroke="#9AA5BD" strokeWidth="3.5" />
          <rect x={236} y={278} width={16} height={14} rx={2} fill="#14172A" stroke="#C9D2E6" />
          {/* warning beacon */}
          <rect x={194} y={150} width={16} height={12} rx={3} fill="#252C44" />
          <circle cx={202} cy={150} r={6} fill={p < 0.5 && mode !== 'idle' ? '#FF647C' : '#54E6A5'} filter={bloom} className={p < 0.5 && mode !== 'idle' ? 'alarm' : ''} />
        </g>
      )
  }
}

/* ----------------------------------------------------------------- effects */

/** Deterministic spark burst; `seed` varies the angles from key to key. */
function Sparks({ x, y, seed, loop }: { x: number; y: number; seed: number; loop: boolean }) {
  return (
    <g className={`sparks ${loop ? 'loop' : ''}`} transform={`translate(${x} ${y})`}>
      <circle className="flash" r={9} fill="#FFF4D6" />
      {Array.from({ length: 9 }, (_, i) => {
        const angle = ((seed * 137.5 + i * 40) % 300) + 120
        const rad = (angle * Math.PI) / 180
        const len = 26 + ((seed + i * 7) % 4) * 8
        return (
          <line key={i} x1={0} y1={0} x2={Math.cos(rad) * len} y2={Math.sin(rad) * len} stroke={i % 3 === 0 ? '#FFFFFF' : '#FFCA70'} strokeWidth={2.5} strokeLinecap="round" style={{ animationDelay: loop ? `${(i % 4) * 0.12}s` : undefined }} />
        )
      })}
    </g>
  )
}

function Smoke({ x, y, big = false }: { x: number; y: number; big?: boolean }) {
  return (
    <g className={`smoke ${big ? 'big' : ''}`} transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={0} r={big ? 14 : 10} />
      <circle cx={10} cy={-7} r={big ? 11 : 8} />
      <circle cx={-8} cy={-11} r={big ? 10 : 7} />
    </g>
  )
}
