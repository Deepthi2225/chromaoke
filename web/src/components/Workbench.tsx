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
import { Part } from './parts'
import { solveElbow, type BenchMode, type Id, type Point } from './sceneTypes'

export type { BenchMode } from './sceneTypes'


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
  /** Stage mode: widens the room with a hologram projector (left) and a robot recharge bay (right). */
  wide?: boolean
  /** Robots shown in the recharge bay (wide mode only). */
  pods?: Pod[]
}

export interface Pod {
  name: string
  hue: number
  owned: boolean
}


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

export function Workbench({ mission, mode, progress, hits = 0, slips = 0, lastEvent = 'hit', width = 440, detail = 'full', label, wide = false, pods = [] }: Props) {
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
  const rElbow = solveElbow(RIGHT_SHOULDER, rightHand, 82, 78)
  const lElbow = solveElbow(LEFT_SHOULDER, leftHand, 80, 78)
  const armKey = mode === 'weld' ? `${hits}-${slips}` : mode
  const full = detail === 'full'

  return (
    <svg
      className={`bench-scene bench-${mode} detail-${detail}`}
      width={width}
      height={(width * 340) / (wide ? 800 : 480)}
      viewBox={wide ? '-160 0 800 340' : '0 0 480 340'}
      role="img"
      aria-label={label ?? 'A technician robot repairing a part at a workbench'}
    >
      <Defs id={id} p={p} vignette="#05060F" />

      {/* far layer, softly out of focus */}
      <g filter={`url(#${id('far')})`}>
        <FarWall id={id} full={full} wide={wide} />
      </g>
      <Lamp id={id} />
      {full && <Motes />}
      {wide && <PodBay id={id} pods={pods} />}

      {/* Tek's soft shadow on the wall, then Tek */}
      <ellipse cx={356} cy={170} rx={92} ry={86} fill="#04050C" opacity="0.45" filter={`url(#${id('soft')})`} />
      <g className="tek">
        <Torso id={id} mode={mode} />
        <Head id={id} mode={mode} slipping={slipping} />
      </g>

      <Bench id={id} full={full} wide={wide} />
      {wide && <Projector id={id} />}
      <ellipse cx={204} cy={304} rx={92} ry={9} fill="#04050C" opacity="0.55" filter={`url(#${id('soft')})`} />
      <Part mission={mission} p={p} id={id} mode={mode} slipping={slipping} hits={hits} />

      {mode === 'scan' && (
        <g className="scan">
          <polygon points="306,121 106,168 106,306 296,306" fill={`url(#${id('beam')})`} className="scan-cone" />
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

      <rect x={wide ? -160 : 0} width={wide ? 800 : 480} height={340} fill={`url(#${id('vignette')})`} pointerEvents="none" />
    </svg>
  )
}

/* ------------------------------------------------------------------ defs */

export function Defs({ id, p, vignette }: { id: Id; p: number; vignette: string }) {
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
        <stop offset="100%" stopColor={vignette} stopOpacity="0.75" />
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
        <stop offset="0%" stopColor="#ECE7E0" />
        <stop offset="45%" stopColor="#8F8A83" />
        <stop offset="100%" stopColor="#35322F" />
      </radialGradient>
      <linearGradient id={id('torso')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ACA69E" />
        <stop offset="100%" stopColor="#45413C" />
      </linearGradient>
      <radialGradient id={id('ball')} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#EEE9E2" />
        <stop offset="55%" stopColor="#8A857E" />
        <stop offset="100%" stopColor="#2C2A27" />
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
      <linearGradient id={id('beacon')} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#FFE3A3" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#7FF0FF" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={id('frost')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E8FBFF" stopOpacity="0.75" />
        <stop offset="50%" stopColor="#BFEFFF" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#E8FBFF" stopOpacity="0.6" />
      </linearGradient>
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

function FarWall({ id, full, wide }: { id: Id; full: boolean; wide: boolean }) {
  const x0 = wide ? -160 : 0
  const x1 = wide ? 640 : 480
  return (
    <g>
      <rect x={x0} width={x1 - x0} height={340} fill={`url(#${id('wall')})`} />
      {wide && <WideWall />}
      {/* wall panels */}
      <g stroke="#251E45" strokeWidth="2">
        <line x1={x0} x2={x1} y1={168} y2={168} />
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
      <rect x={210} y={4} width={x1 - 210} height={9} rx={4} fill="#2C2650" />
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

function Bench({ id, full, wide }: { id: Id; full: boolean; wide: boolean }) {
  const x0 = wide ? -160 : 0
  const x1 = wide ? 640 : 480
  return (
    <g>
      <polygon points={`${x0},246 ${x1},246 ${x1},340 ${x0},340`} fill={`url(#${id('wood')})`} />
      <g stroke="#2A1A22" strokeOpacity="0.55" strokeWidth="1.5">
        <line x1={x0} x2={x1} y1={268} y2={268} />
        <line x1={x0} x2={x1} y1={296} y2={296} />
        <line x1={x0} x2={x1} y1={326} y2={326} />
      </g>
      <line x1={x0} x2={x1} y1={246.5} y2={246.5} stroke="#FFD89A" strokeOpacity="0.45" strokeWidth="2" />
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

/* ------------------------------------------------------- stage extensions */

/** Left side of the wide room: a tool cabinet, a vent fan and a hanging cable. */
function WideWall() {
  return (
    <g>
      <rect x={-150} y={70} width={112} height={176} rx={6} fill="#1A1838" stroke="#2A2350" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={-142} y={80 + i * 40} width={96} height={32} rx={3} fill="#221F45" stroke="#2F2856" />
          <rect x={-104} y={92 + i * 40} width={20} height={5} rx={2} fill="#4A4578" />
        </g>
      ))}
      <circle cx={-96} cy={36} r={22} fill="#120F28" stroke="#2A2350" strokeWidth="4" />
      <path d="M-96 36 l0 -17 a6 6 0 0 1 6 6z M-96 36 l17 0 a6 6 0 0 1 -6 6z M-96 36 l0 17 a6 6 0 0 1 -6 -6z M-96 36 l-17 0 a6 6 0 0 1 6 -6z" fill="#3B3468" className="fan" />
      <path d="M-20 13 C -30 70 4 92 -8 150" fill="none" stroke="#2C2650" strokeWidth="3" />
      <rect x={-160} y={4} width={370} height={9} rx={4} fill="#2C2650" />
    </g>
  )
}

/** Holographic projector on the bench; the stats hologram floats in its beam. */
function Projector({ id }: { id: Id }) {
  return (
    <g className="projector">
      <polygon points="-104,262 -86,262 -34,128 -156,128" fill="#36D9F5" opacity="0.13" filter={`url(#${id('haze')})`} className="holo-beam" />
      <ellipse cx={-95} cy={292} rx={42} ry={6} fill="#04050C" opacity="0.5" filter={`url(#${id('soft')})`} />
      <path d="M-130 290 L-124 270 H-66 L-60 290 Z" fill="#2A2F4C" stroke="#14172A" strokeWidth="2" />
      <rect x={-112} y={262} width={34} height={9} rx={3} fill="#3A4060" />
      <ellipse cx={-95} cy={262} rx={13} ry={3.5} fill="#7FF0FF" filter={`url(#${id('bloom')})`} className="holo-lens" />
      {[0, 1, 2].map((i) => <circle key={i} cx={-118 + i * 8} cy={282} r={2} fill={i === 0 ? '#54E6A5' : '#36D9F5'} className="led" style={{ animationDelay: `${i * 0.4}s` }} />)}
    </g>
  )
}

/** Wall-mounted recharge bay: rescued robots glow in their tubes, the rest are blueprints. */
function PodBay({ id, pods }: { id: Id; pods: Pod[] }) {
  return (
    <g className="pod-bay">
      <rect x={480} y={104} width={156} height={148} rx={6} fill="#10132A" stroke="#2A3050" strokeWidth="2" />
      <rect x={480} y={104} width={156} height={10} rx={3} fill="#1E2340" />
      {pods.map((pod, i) => {
        const x = 490 + i * 29
        const cx = x + 12
        const body = `hsl(${pod.hue} 55% 72%)`
        return (
          <g key={pod.name} className={`pod ${pod.owned ? 'owned' : 'empty'}`}>
            <title>{pod.owned ? `${pod.name}: repaired` : 'Not repaired yet'}</title>
            <rect x={x - 2} y={118} width={28} height={10} rx={3} fill={`url(#${id('metal')})`} />
            <rect x={x} y={128} width={24} height={104} rx={11} fill="#060812" />
            {pod.owned && <rect x={x + 2} y={130} width={20} height={100} rx={9} fill={`hsl(${pod.hue} 85% 60%)`} opacity="0.22" filter={`url(#${id('bloom')})`} />}
            {pod.owned ? (
              <g className="pod-bot" style={{ animationDelay: `${i * 0.45}s` }}>
                <line x1={cx} y1={170} x2={cx} y2={164} stroke={body} strokeWidth="1.5" />
                <circle cx={cx} cy={163} r={2} fill="#FFCA70" />
                <rect x={cx - 9} y={170} width={18} height={15} rx={5} fill={body} />
                <rect x={cx - 6} y={173} width={12} height={9} rx={3} fill="#0B1020" />
                <g className="pod-eyes" style={{ animationDelay: `${i * 0.7}s` }}>
                  <circle cx={cx - 2.8} cy={177.5} r={1.6} fill="#54E6A5" />
                  <circle cx={cx + 2.8} cy={177.5} r={1.6} fill="#54E6A5" />
                </g>
                <rect x={cx - 7} y={187} width={14} height={14} rx={4} fill={body} />
                <rect x={cx - 10} y={188} width={3} height={10} rx={1.5} fill={body} />
                <rect x={cx + 7} y={188} width={3} height={10} rx={1.5} fill={body} />
              </g>
            ) : (
              <g fill="none" stroke="#36D9F5" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="2 2">
                <rect x={cx - 9} y={170} width={18} height={15} rx={5} />
                <rect x={cx - 7} y={187} width={14} height={14} rx={4} />
                <line x1={cx} y1={170} x2={cx} y2={164} />
              </g>
            )}
            {pod.owned && [0, 1].map((b) => <circle key={b} cx={cx - 5 + b * 9} cy={222} r={1.4} fill="#FFFFFF" opacity="0.6" className="bubble" style={{ animationDelay: `${i * 0.3 + b * 1.1}s` }} />)}
            <rect x={x} y={128} width={24} height={104} rx={11} fill={`url(#${id('glass')})`} stroke="#4A5571" strokeWidth="1.5" />
            <rect x={x + 3} y={134} width={4} height={90} rx={2} fill="#FFFFFF" opacity="0.22" />
            <rect x={x - 2} y={230} width={28} height={14} rx={3} fill={`url(#${id('metal')})`} />
            <circle cx={cx} cy={237} r={2.4} fill={pod.owned ? '#54E6A5' : '#5A2A38'} filter={pod.owned ? `url(#${id('bloom')})` : undefined} />
          </g>
        )
      })}
    </g>
  )
}


/* --------------------------------------------------------------------- Tek */

// Tek, technician model: weathered gunmetal humanoid with goggles (after the project's concept art).
// Drawn in Tek's own 480 x 340 frame; shoulders sit at (278, 206) and (368, 210).
export function Torso({ id, mode }: { id: Id; mode: BenchMode }) {
  const core = mode === 'fail' ? '#FFCA70' : mode === 'celebrate' ? '#54E6A5' : '#36D9F5'
  return (
    <g>
      {/* ribbed neck */}
      <rect x={311} y={148} width={22} height={40} rx={5} fill="#2B2927" />
      {[156, 165, 174].map((y) => <rect key={y} x={308} y={y} width={28} height={4} rx={2} fill="#6A655F" />)}
      {/* cables running down the back */}
      <path d="M298 186 C 282 202 282 234 294 256" fill="none" stroke="#1C1A18" strokeWidth="6" />
      <path d="M348 186 C 364 204 362 236 352 256" fill="none" stroke="#1C1A18" strokeWidth="5" />
      {/* chest plate */}
      <path d="M276 198 Q279 182 300 180 L344 180 Q365 182 368 198 L360 252 Q356 276 336 278 L308 278 Q288 276 284 252 Z" fill={`url(#${id('torso')})`} stroke="#141210" strokeWidth="2.5" />
      <path d="M322 182 V240" stroke="#1C1A18" strokeWidth="2" />
      <path d="M288 216 Q322 230 356 216" fill="none" stroke="#1C1A18" strokeWidth="2" />
      <path d="M286 198 Q300 188 318 188" fill="none" stroke="#F0C99A" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
      {/* amber ID badge */}
      <rect x={330} y={194} width={22} height={9} rx={1.5} fill="#E0A84A" stroke="#7A4A12" strokeWidth="1" />
      <rect x={333} y={197} width={11} height={1.6} fill="#7A4A12" />
      <rect x={333} y={199.6} width={7} height={1.4} fill="#7A4A12" />
      {/* status light */}
      <circle cx={304} cy={200} r={5} fill={core} filter={`url(#${id('bloom')})`} className="chest-light" />
      {/* vents */}
      {[0, 1, 2].map((i) => <rect key={i} x={300} y={234 + i * 7} width={44} height={3} rx={1.5} fill="#1C1A18" />)}
      {/* rivets, rust and wear */}
      {[[290, 206], [354, 208], [292, 246], [352, 246]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r={2.4} fill="#3A3634" />
          <circle cx={x - 0.7} cy={y - 0.7} r={0.9} fill="#E8E2DA" opacity="0.7" />
        </g>
      ))}
      <circle cx={348} cy={226} r={4} fill="#8A5530" opacity="0.45" />
      <circle cx={296} cy={226} r={2.6} fill="#8A5530" opacity="0.4" />
    </g>
  )
}

export function Head({ id, mode, slipping }: { id: Id; mode: BenchMode; slipping: boolean }) {
  const happy = mode === 'celebrate'
  const sad = mode === 'fail'
  const lamp = sad ? '#FFCA70' : '#36D9F5'
  return (
    <g className="tek-head">
      {/* ear discs */}
      {[282, 362].map((x) => (
        <g key={x}>
          <circle cx={x} cy={118} r={11} fill={`url(#${id('rim')})`} stroke="#141210" strokeWidth="2" />
          <circle cx={x} cy={118} r={5} fill={lamp} filter={`url(#${id('bloom')})`} className="side-lamp" />
        </g>
      ))}
      {/* helmet */}
      <circle cx={322} cy={110} r={42} fill={`url(#${id('dome')})`} stroke="#141210" strokeWidth="2.5" />
      <path d="M322 68 V98" stroke="#2A2724" strokeWidth="3" />
      <path d="M283 104 Q322 92 361 104" fill="none" stroke="#2A2724" strokeWidth="2" />
      <ellipse cx={303} cy={84} rx={14} ry={7} fill="#FFFFFF" opacity="0.42" transform="rotate(-28 303 84)" />
      <path d="M286 100 A 42 42 0 0 1 308 72" fill="none" stroke="#F0C99A" strokeOpacity="0.45" strokeWidth="2.5" />
      <circle cx={346} cy={88} r={3} fill="#8A5530" opacity="0.45" />
      {/* faceplate and mouth grille */}
      <path d="M291 126 Q293 156 322 158 Q351 156 353 126 Z" fill="#3A3633" stroke="#141210" strokeWidth="2" />
      {happy ? (
        <path d="M312 145 Q322 152 332 145" fill="none" stroke="#54E6A5" strokeWidth="2.5" strokeLinecap="round" filter={`url(#${id('bloom')})`} />
      ) : (
        [314, 320, 326, 332].map((x) => <line key={x} x1={x - 2} x2={x - 2} y1={142} y2={sad ? 148 : 151} stroke="#141210" strokeWidth="2.5" strokeLinecap="round" />)
      )}
      {/* goggle strap and goggles */}
      <rect x={280} y={114} width={84} height={11} rx={4} fill="#2A2420" />
      <Goggle id={id} cx={305} cy={120} r={12} happy={happy} sad={sad} slipping={slipping} />
      <Goggle id={id} cx={339} cy={120} r={12} happy={happy} sad={sad} slipping={slipping} />
    </g>
  )
}

function Goggle({ id, cx, cy, r, happy, sad, slipping }: { id: Id; cx: number; cy: number; r: number; happy: boolean; sad: boolean; slipping: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 5} fill={`url(#${id('rim')})`} stroke="#0E0C0A" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r + 1.5} fill="#070912" />
      {!sad && <circle cx={cx} cy={cy} r={r + 2} fill="#36D9F5" opacity="0.6" filter={`url(#${id('bloom')})`} />}
      <circle cx={cx} cy={cy} r={r} fill={sad ? '#6E5326' : `url(#${id('lens')})`} className="lens" />
      {slipping && <circle cx={cx} cy={cy} r={r} fill="#FF647C" opacity="0.65" className="lens-alarm" />}
      {happy ? (
        <path d={`M${cx - r * 0.55} ${cy + 3} q${r * 0.55} -${r * 0.8} ${r * 1.1} 0`} fill="none" stroke="#06303A" strokeWidth="3" strokeLinecap="round" />
      ) : sad ? (
        <rect x={cx - r - 1} y={cy - r - 1} width={r * 2 + 2} height={r + 1} fill="#141210" />
      ) : (
        <circle cx={cx - r * 0.15} cy={cy + r * 0.15} r={r * 0.3} fill="#063A47" />
      )}
      <path d={`M${cx - r * 0.7} ${cy - r * 0.1} A ${r * 0.72} ${r * 0.72} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.7}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

/** A segmented mechanical arm with a hydraulic piston on each segment and jointed fingers. */
export function Arm({ id, shoulder, elbowAt, hand }: { id: Id; shoulder: Point; elbowAt: Point; hand: Point }) {
  const path = `M${shoulder.x} ${shoulder.y} L${elbowAt.x} ${elbowAt.y} L${hand.x} ${hand.y}`
  const hl = `M${shoulder.x - 1.2} ${shoulder.y - 2} L${elbowAt.x - 1.2} ${elbowAt.y - 2} L${hand.x - 1.2} ${hand.y - 2}`
  const angle = (Math.atan2(hand.y - elbowAt.y, hand.x - elbowAt.x) * 180) / Math.PI
  const piston = (a: Point, b: Point) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const nx = (-dy / len) * 6
    const ny = (dx / len) * 6
    return { x1: a.x + dx * 0.22 + nx, y1: a.y + dy * 0.22 + ny, x2: a.x + dx * 0.78 + nx, y2: a.y + dy * 0.78 + ny }
  }
  return (
    <g className="tek-arm">
      <path d={path} fill="none" stroke="#141210" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="#6E6862" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d={hl} fill="none" stroke="#D8D2CA" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {[piston(shoulder, elbowAt), piston(elbowAt, hand)].map((l, i) => (
        <g key={i}>
          <line {...l} stroke="#141210" strokeWidth="4.5" strokeLinecap="round" />
          <line {...l} stroke="#B8B2AA" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {/* shoulder pad */}
      <circle cx={shoulder.x} cy={shoulder.y} r={15} fill={`url(#${id('ball')})`} stroke="#141210" strokeWidth="2" />
      <path d={`M${shoulder.x - 13} ${shoulder.y - 4} Q${shoulder.x} ${shoulder.y - 18} ${shoulder.x + 13} ${shoulder.y - 4}`} fill="none" stroke="#141210" strokeWidth="1.5" />
      <circle cx={elbowAt.x} cy={elbowAt.y} r={8} fill={`url(#${id('ball')})`} stroke="#141210" strokeWidth="2" />
      <g transform={`translate(${hand.x} ${hand.y}) rotate(${angle})`}>
        {/* jointed fingers and thumb */}
        <g stroke="#141210" strokeWidth="1.2">
          <path d="M8 -6 L16 -8 L23 -6" fill="none" stroke="#141210" strokeWidth="4.6" strokeLinecap="round" />
          <path d="M8 -6 L16 -8 L23 -6" fill="none" stroke="#9A948C" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M9 0 L18 0 L25 2" fill="none" stroke="#141210" strokeWidth="4.6" strokeLinecap="round" />
          <path d="M9 0 L18 0 L25 2" fill="none" stroke="#9A948C" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M5 6 L12 11 L17 13" fill="none" stroke="#141210" strokeWidth="4.6" strokeLinecap="round" />
          <path d="M5 6 L12 11 L17 13" fill="none" stroke="#9A948C" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx={16} cy={-8} r={1.3} fill="#3A3634" /><circle cx={18} cy={0} r={1.3} fill="#3A3634" /><circle cx={12} cy={11} r={1.3} fill="#3A3634" />
        </g>
        <rect x={-6} y={-8} width={15} height={16} rx={5} fill={`url(#${id('ball')})`} stroke="#141210" strokeWidth="2" />
        <circle r={4.5} fill="#2B2927" />
      </g>
    </g>
  )
}

export function Iron({ from, to }: { from: Point; to: Point }) {
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

/* ----------------------------------------------------------------- effects */

/** Deterministic spark burst; `seed` varies the angles from key to key. */
export function Sparks({ x, y, seed, loop }: { x: number; y: number; seed: number; loop: boolean }) {
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

export function Smoke({ x, y, big = false }: { x: number; y: number; big?: boolean }) {
  return (
    <g className={`smoke ${big ? 'big' : ''}`} transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={0} r={big ? 14 : 10} />
      <circle cx={10} cy={-7} r={big ? 11 : 8} />
      <circle cx={-8} cy={-11} r={big ? 10 : 7} />
    </g>
  )
}
