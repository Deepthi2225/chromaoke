// Workshop scene: Tek, the goggle-eyed technician robot, repairs the part each
// mission is about (vision Sections 4 and 6.3). All artwork is original SVG.
// `progress` (0-1) drives how repaired the part looks; `hits` and `slips`
// trigger a weld spark or a tool slip on every keystroke.

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
  /** 'card' drops the costly backdrop details for small thumbnails. */
  detail?: 'full' | 'card'
  label?: string
}

type Point = { x: number; y: number }

// Where Tek's soldering iron touches, and where the other hand holds, per part.
const RIG: Record<MissionId, { tip: Point; hold: Point }> = {
  battery: { tip: { x: 250, y: 214 }, hold: { x: 158, y: 238 } },
  circuit: { tip: { x: 196, y: 278 }, hold: { x: 116, y: 284 } },
  code: { tip: { x: 268, y: 236 }, hold: { x: 146, y: 248 } },
  comms: { tip: { x: 230, y: 276 }, hold: { x: 156, y: 270 } },
  shutdown: { tip: { x: 246, y: 284 }, hold: { x: 156, y: 252 } },
}
const LEFT_SHOULDER = { x: 278, y: 206 }
const RIGHT_SHOULDER = { x: 366, y: 212 }
const REST_HAND = { x: 330, y: 262 }

/**
 * Two-segment inverse kinematics. Of the two possible elbow positions, `prefer`
 * picks the natural one: elbows down, like a technician hunched over the bench.
 */
function elbow(shoulder: Point, hand: Point, upper: number, fore: number, prefer: (a: Point, b: Point) => Point): Point {
  const dx = hand.x - shoulder.x
  const dy = hand.y - shoulder.y
  const d = Math.min(Math.hypot(dx, dy), upper + fore - 0.01)
  const a = (upper * upper - fore * fore + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, upper * upper - a * a))
  const ux = dx / d
  const uy = dy / d
  const mx = shoulder.x + ux * a
  const my = shoulder.y + uy * a
  return prefer({ x: mx - uy * h, y: my + ux * h }, { x: mx + uy * h, y: my - ux * h })
}
const downward = (a: Point, b: Point) => (a.y >= b.y ? a : b)

export function Workbench({ mission, mode, progress, hits = 0, slips = 0, lastEvent = 'hit', width = 440, detail = 'full', label }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (name: string) => `${uid}-${name}`
  const p = mode === 'celebrate' ? 1 : Math.max(0, Math.min(1, progress))
  const working = mode === 'weld' || mode === 'demo'
  const resting = mode === 'celebrate' || mode === 'fail' || mode === 'idle'
  const slipping = mode === 'weld' && lastEvent === 'slip' && slips > 0
  const rig = RIG[mission]
  const tip = resting ? { x: REST_HAND.x - 30, y: REST_HAND.y + 18 } : rig.tip
  const rightHand = resting ? REST_HAND : { x: tip.x + 34, y: tip.y - 24 }
  const leftHand = mode === 'celebrate' ? { x: 236, y: 170 } : rig.hold
  const rElbow = elbow(RIGHT_SHOULDER, rightHand, 80, 76, downward)
  const lElbow = elbow(LEFT_SHOULDER, leftHand, 78, 76, downward)
  const armKey = mode === 'weld' ? `${hits}-${slips}` : mode

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
      <Backdrop id={id} detail={detail} />

      {/* Tek's body sits behind the bench top */}
      <g className="tek">
        <rect x={262} y={168} width={122} height={110} rx={42} fill={`url(#${id('tek')})`} stroke="#2A2547" strokeWidth="3" />
        <circle cx={322} cy={214} r={7} fill={mode === 'fail' ? '#FFCA70' : '#36D9F5'} className="chest-light" />
        <Head id={id} mode={mode} slipping={slipping} />
      </g>

      {/* bench */}
      <polygon points="0,248 480,248 480,340 0,340" fill={`url(#${id('wood')})`} />
      <line x1={0} x2={480} y1={248.5} y2={248.5} stroke="#FFCA70" strokeOpacity="0.35" strokeWidth="2" />
      <ellipse cx={205} cy={292} rx={190} ry={42} fill={`url(#${id('pool')})`} className="lamp-pool" />
      {detail === 'full' && <BenchClutter />}

      {/* the part being repaired */}
      <Part mission={mission} p={p} id={id} mode={mode} slipping={slipping} />

      {mode === 'scan' && (
        <g className="scan">
          <polygon points="278,146 112,170 112,302 290,302" fill={`url(#${id('beam')})`} className="scan-cone" />
          <line x1={110} x2={292} y1={0} y2={0} stroke="#36D9F5" strokeWidth="2" className="scan-line" />
        </g>
      )}

      {/* arms in front of the part */}
      <Arm shoulder={LEFT_SHOULDER} elbowAt={lElbow} hand={leftHand} />
      <g key={armKey} className={`arm-right ${mode === 'weld' ? (slipping ? 'slip' : hits ? 'tap' : '') : ''}`}>
        <Arm shoulder={RIGHT_SHOULDER} elbowAt={rElbow} hand={rightHand} />
        {/* soldering iron */}
        <line x1={rightHand.x} y1={rightHand.y} x2={(rightHand.x + tip.x) / 2} y2={(rightHand.y + tip.y) / 2} stroke="#E0A84A" strokeWidth="8" strokeLinecap="round" />
        <line x1={(rightHand.x + tip.x) / 2} y1={(rightHand.y + tip.y) / 2} x2={tip.x} y2={tip.y} stroke="#C7CFE0" strokeWidth="3" strokeLinecap="round" />
        {working && <circle cx={tip.x} cy={tip.y} r={12} fill={`url(#${id('torch')})`} className="torch" />}
        {working && <Sparks key={`s${hits}`} x={tip.x} y={tip.y} seed={hits} loop={mode === 'demo'} />}
        {slipping && <Smoke x={tip.x} y={tip.y} />}
      </g>

      {mode === 'celebrate' && (
        <g className="holo-check">
          <circle cx={150} cy={118} r={24} fill="#54E6A5" fillOpacity="0.15" stroke="#54E6A5" strokeWidth="3" />
          <path d="M139 118 l8 8 l15 -16" fill="none" stroke="#54E6A5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {mode === 'fail' && <Smoke x={200} y={200} big />}
    </svg>
  )
}

function Defs({ id, p }: { id: (n: string) => string; p: number }) {
  return (
    <defs>
      <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1A1230" />
        <stop offset="100%" stopColor="#0E1124" />
      </linearGradient>
      <radialGradient id={id('warm')} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFCA70" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#FFCA70" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id('pink')} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF647C" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#FF647C" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id('cyan')} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#36D9F5" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#36D9F5" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id('wood')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5A3A33" />
        <stop offset="100%" stopColor="#2A1A24" />
      </linearGradient>
      <radialGradient id={id('pool')} cx="50%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#FFCA70" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FFCA70" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id('tek')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#A49FD0" />
        <stop offset="100%" stopColor="#4B4870" />
      </linearGradient>
      <radialGradient id={id('lens')} cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#E9FDFF" />
        <stop offset="45%" stopColor="#36D9F5" />
        <stop offset="100%" stopColor="#0F6E86" />
      </radialGradient>
      <radialGradient id={id('torch')} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="35%" stopColor="#FFE3A3" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#FFCA70" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#5D6A88" />
        <stop offset="45%" stopColor="#B9C3D9" />
        <stop offset="100%" stopColor="#4A5571" />
      </linearGradient>
      <linearGradient id={id('beam')} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#36D9F5" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#36D9F5" stopOpacity="0.02" />
      </linearGradient>
      <linearGradient id={id('glass')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#C7CFE0" stopOpacity="0.35" />
        <stop offset="50%" stopColor="#C7CFE0" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#C7CFE0" stopOpacity="0.3" />
      </linearGradient>
      <radialGradient id={id('core')} cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor={coreColor(p)} />
        <stop offset="100%" stopColor={coreColor(p)} stopOpacity="0.6" />
      </radialGradient>
      <pattern id={id('holes')} width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="1.3" fill="#2F2850" />
      </pattern>
      <pattern id={id('hazard')} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="14" fill="#FFCA70" />
        <rect x="7" width="7" height="14" fill="#1B1F33" />
      </pattern>
    </defs>
  )
}

/** Reactor core cools from coral red (0) to electric cyan (1). */
const coreColor = (p: number) => `hsl(${Math.round(350 - p * 160)} 90% 62%)`

function Backdrop({ id, detail }: { id: (n: string) => string; detail: 'full' | 'card' }) {
  return (
    <g className="backdrop">
      <rect width={480} height={340} fill={`url(#${id('wall')})`} />
      <circle cx={420} cy={40} r={210} fill={`url(#${id('warm')})`} />
      <circle cx={110} cy={20} r={170} fill={`url(#${id('pink')})`} />
      <circle cx={30} cy={210} r={160} fill={`url(#${id('cyan')})`} />
      {detail === 'full' && (
        <>
          {/* pegboard with tools */}
          <rect x={26} y={28} width={156} height={94} rx={6} fill="#1B1730" stroke="#2A2445" strokeWidth="2" />
          <rect x={26} y={28} width={156} height={94} rx={6} fill={`url(#${id('holes')})`} />
          <g fill="#2E2848" stroke="#4A4270" strokeWidth="1.5">
            <path d="M46 44 a9 9 0 1 1 10 12 l0 44 h-8 v-44 a9 9 0 0 1 -2 -12z" />
            <rect x={76} y={42} width={10} height={30} rx={3} />
            <rect x={79} y={72} width={4} height={34} />
            <path d="M104 44 l10 0 l6 40 l-4 22 l-4 -22 l-4 22 l-4 -22z" />
            <rect x={136} y={46} width={30} height={22} rx={4} />
            <circle cx={151} cy={92} r={12} fill="none" />
          </g>
          {/* shelf with jars */}
          <rect x={26} y={170} width={160} height={6} rx={2} fill="#2A2240" />
          <rect x={40} y={128} width={34} height={42} rx={7} fill="#24405E" stroke="#36D9F5" strokeOpacity="0.25" />
          <rect x={40} y={142} width={34} height={12} fill="#FFCA70" fillOpacity="0.55" />
          <rect x={46} y={120} width={22} height={9} rx={2} fill="#3B3560" />
          <rect x={88} y={140} width={22} height={30} rx={5} fill="#3B2B4F" />
          <rect x={120} y={146} width={40} height={24} rx={4} fill="#1F2A3F" stroke="#2A3A58" />
          {/* server rack with speakers and LEDs */}
          <rect x={404} y={58} width={64} height={190} rx={6} fill="#171A2C" stroke="#2A3050" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={414 + (i % 3) * 14} y={70 + Math.floor(i / 3) * 10} width={8} height={4} rx={1} fill={['#54E6A5', '#FF647C', '#FFCA70', '#36D9F5', '#54E6A5'][i]} className="led" style={{ animationDelay: `${i * 0.37}s` }} />
          ))}
          <circle cx={436} cy={130} r={20} fill="#0F1120" stroke="#2A3050" strokeWidth="5" />
          <circle cx={436} cy={130} r={7} fill="#2A3050" />
          <circle cx={436} cy={196} r={24} fill="#0F1120" stroke="#2A3050" strokeWidth="5" />
          <circle cx={436} cy={196} r={8} fill="#2A3050" />
          {/* hanging cables */}
          <path d="M214 0 C 204 50 246 70 236 118" fill="none" stroke="#2C2444" strokeWidth="3" />
          <path d="M386 0 C 396 60 360 90 392 150" fill="none" stroke="#2C2444" strokeWidth="3" />
          {/* soft bokeh */}
          <g className="bokeh">
            <circle cx={250} cy={40} r={14} fill="#FFCA70" opacity="0.18" />
            <circle cx={300} cy={22} r={9} fill="#FF647C" opacity="0.18" />
            <circle cx={190} cy={70} r={8} fill="#36D9F5" opacity="0.16" />
          </g>
        </>
      )}
    </g>
  )
}

function BenchClutter() {
  return (
    <g className="clutter">
      {/* cable coil */}
      <g fill="none" stroke="#2B2540" strokeWidth="4">
        <ellipse cx={46} cy={300} rx={34} ry={13} />
        <ellipse cx={46} cy={296} rx={28} ry={10} />
        <ellipse cx={46} cy={292} rx={22} ry={8} />
      </g>
      {/* screwdriver */}
      <rect x={330} y={312} width={60} height={9} rx={4} fill="#FF647C" opacity="0.8" transform="rotate(-8 330 312)" />
      <rect x={388} y={302} width={44} height={4} rx={2} fill="#C7CFE0" transform="rotate(-8 388 302)" />
      {/* solder spool */}
      <ellipse cx={444} cy={296} rx={16} ry={6} fill="#3B3560" />
      <rect x={428} y={276} width={32} height={20} fill="#C7CFE0" opacity="0.75" />
      <ellipse cx={444} cy={276} rx={16} ry={6} fill="#8C86B8" />
    </g>
  )
}

function Head({ id, mode, slipping }: { id: (n: string) => string; mode: BenchMode; slipping: boolean }) {
  const happy = mode === 'celebrate'
  const sad = mode === 'fail'
  return (
    <g className="tek-head">
      {/* antenna wires */}
      <path d="M298 56 C 288 34 268 30 258 14" fill="none" stroke="#8C86B8" strokeWidth="2.5" />
      <path d="M342 56 C 352 32 374 28 384 12" fill="none" stroke="#8C86B8" strokeWidth="2.5" />
      <circle cx={258} cy={13} r={3.5} fill="#FFCA70" />
      <circle cx={384} cy={11} r={3.5} fill="#36D9F5" />
      {/* dome */}
      <ellipse cx={318} cy={112} rx={76} ry={62} fill={`url(#${id('tek')})`} stroke="#2A2547" strokeWidth="3" />
      <path d="M250 104 Q 318 82 388 106" fill="none" stroke="#2A2547" strokeWidth="2" />
      <path d="M246 120 A 76 62 0 0 1 300 52" fill="none" stroke="#36D9F5" strokeOpacity="0.45" strokeWidth="3" />
      <path d="M352 56 A 76 62 0 0 1 392 112" fill="none" stroke="#FFCA70" strokeOpacity="0.4" strokeWidth="3" />
      {[[290, 90], [346, 92], [364, 70], [300, 66], [372, 98]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={3.2} fill="#3A3560" />)}
      {/* side lamp */}
      <circle cx={390} cy={120} r={18} fill="#1B1F33" />
      <circle cx={390} cy={120} r={11} fill={sad ? '#FFCA70' : '#36D9F5'} className="side-lamp" />
      {/* goggles */}
      <rect x={276} y={136} width={40} height={10} fill="#1B1F33" />
      <Goggle id={id} cx={278} cy={140} r={25} happy={happy} sad={sad} slipping={slipping} />
      <Goggle id={id} cx={340} cy={146} r={23} happy={happy} sad={sad} slipping={slipping} />
    </g>
  )
}

function Goggle({ id, cx, cy, r, happy, sad, slipping }: { id: (n: string) => string; cx: number; cy: number; r: number; happy: boolean; sad: boolean; slipping: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 7} fill="#1B1F33" stroke="#3A3560" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r} fill={sad ? '#7A5A2A' : `url(#${id('lens')})`} className="lens" />
      {slipping && <circle cx={cx} cy={cy} r={r} fill="#FF647C" opacity="0.55" className="lens-alarm" />}
      {happy ? (
        <path d={`M${cx - r * 0.5} ${cy + 3} q${r * 0.5} -${r * 0.7} ${r} 0`} fill="none" stroke="#0B1020" strokeWidth="4" strokeLinecap="round" />
      ) : sad ? (
        <rect x={cx - r} y={cy - r} width={r * 2} height={r} fill="#1B1F33" />
      ) : (
        <>
          <circle cx={cx - r * 0.25} cy={cy + r * 0.2} r={r * 0.22} fill="#0B3B4A" />
          <ellipse cx={cx - r * 0.35} cy={cy - r * 0.38} rx={r * 0.28} ry={r * 0.16} fill="#FFFFFF" opacity="0.8" />
        </>
      )}
    </g>
  )
}

function Arm({ shoulder, elbowAt, hand }: { shoulder: Point; elbowAt: Point; hand: Point }) {
  const path = `M${shoulder.x} ${shoulder.y} L${elbowAt.x} ${elbowAt.y} L${hand.x} ${hand.y}`
  return (
    <g className="tek-arm">
      <path d={path} fill="none" stroke="#3A3660" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="#8C86B8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={shoulder.x} cy={shoulder.y} r={11} fill="#4B4870" stroke="#2A2547" strokeWidth="2" />
      <circle cx={elbowAt.x} cy={elbowAt.y} r={9} fill="#4B4870" stroke="#A49FD0" strokeWidth="2" />
      <circle cx={hand.x} cy={hand.y} r={11} fill="#5A5585" stroke="#2A2547" strokeWidth="2" />
      <circle cx={hand.x - 7} cy={hand.y + 7} r={4.5} fill="#5A5585" stroke="#2A2547" strokeWidth="1.5" />
      <circle cx={hand.x + 2} cy={hand.y + 10} r={4.5} fill="#5A5585" stroke="#2A2547" strokeWidth="1.5" />
    </g>
  )
}

function Part({ mission, p, id, mode, slipping }: { mission: MissionId; p: number; id: (n: string) => string; mode: BenchMode; slipping: boolean }) {
  switch (mission) {
    case 'battery': {
      const lit = Math.ceil(p * 5 - 0.001)
      const color = p < 0.4 ? '#FF647C' : p < 0.75 ? '#FFCA70' : '#54E6A5'
      return (
        <g className="part">
          <path d="M184 172 C 150 180 120 230 96 252" fill="none" stroke="#FF647C" strokeWidth="3" />
          <path d="M220 172 C 260 176 270 220 300 250" fill="none" stroke="#2C2444" strokeWidth="3" />
          <rect x={160} y={168} width={84} height={128} rx={16} fill={`url(#${id('metal')})`} stroke="#2A3050" strokeWidth="3" />
          <rect x={186} y={156} width={32} height={14} rx={4} fill="#8C96B0" stroke="#2A3050" strokeWidth="2" />
          <rect x={176} y={188} width={52} height={92} rx={8} fill="#0B1020" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={182} y={264 - i * 17} width={40} height={12} rx={3} fill={i < lit ? color : '#1C2740'} className={i < lit ? 'cell-on' : ''} />
          ))}
          {/* charge-controller port on the side of the cell */}
          <rect x={243} y={204} width={9} height={20} rx={2} fill="#1B1F33" stroke="#C7CFE0" strokeWidth="1.5" />
          {lit === 0 && <path d="M206 206 l-10 22 h10 l-6 20 l16 -26 h-10 l6 -16z" fill="#FF647C" className="empty-bolt" />}
          {(mode === 'weld' || mode === 'demo') && (
            <path d="M190 160 l-8 -6 l6 -2 l-8 -8 M214 160 l8 -6 l-6 -2 l8 -8" fill="none" stroke="#7FF0FF" strokeWidth="2" className="arc" />
          )}
        </g>
      )
    }
    case 'circuit': {
      const traces = ['M118 294 H150 L158 286', 'M186 280 H206', 'M233 286 H262 L274 298', 'M168 270 L176 262 H236', 'M246 266 L262 266 L270 278']
      return (
        <g className="part">
          <polygon points="92,302 298,302 298,309 92,309" fill="#123526" />
          <polygon points="110,258 280,258 298,302 92,302" fill="#1F5A45" stroke="#2E7A5C" strokeWidth="2" />
          {traces.map((d) => <path key={d} d={d} fill="none" stroke="#2E7A5C" strokeWidth="3" strokeLinecap="round" />)}
          {traces.map((d) => (
            <path key={`lit-${d}`} d={d} pathLength={100} fill="none" stroke="#36D9F5" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${p * 100} 100`} className="trace-lit" />
          ))}
          <rect x={150} y={270} width={36} height={18} rx={2} fill="#11161F" stroke="#3A4560" />
          <rect x={206} y={274} width={28} height={20} rx={2} fill="#11161F" stroke="#3A4560" />
          <rect x={248} y={242} width={10} height={20} rx={3} fill="#A78BFA" />
          <ellipse cx={253} cy={242} rx={5} ry={2} fill="#C9B8FF" />
          <rect x={130} y={250} width={9} height={16} rx={3} fill="#FFCA70" />
          <circle cx={262} cy={288} r={4} fill={p > 0.95 ? '#54E6A5' : '#FF647C'} className="status-led" />
        </g>
      )
    }
    case 'code': {
      const lines = Math.floor(p * 7)
      const widths = [70, 52, 80, 44, 66, 58, 74]
      return (
        <g className="part">
          <rect x={180} y={280} width={44} height={14} rx={3} fill="#8E8670" />
          <rect x={138} y={168} width={128} height={114} rx={14} fill="#CFC6AD" stroke="#6E6650" strokeWidth="3" />
          <rect x={150} y={180} width={104} height={78} rx={9} fill="#06180F" stroke="#3B3628" strokeWidth="3" />
          {widths.slice(0, lines).map((w, i) => (
            <rect key={i} x={158} y={188 + i * 9} width={w} height={4} rx={1} fill="#54E6A5" opacity={0.6 + (i % 2) * 0.3} />
          ))}
          {lines < 7 && <rect x={158} y={188 + lines * 9} width={6} height={5} fill="#54E6A5" className="cursor" />}
          {mode !== 'celebrate' && p < 1 && <rect x={150} y={180} width={104} height={78} rx={9} fill="#FF647C" opacity={slipping ? 0.35 : 0.06} className="crt-glitch" />}
          <rect x={262} y={202} width={10} height={60} rx={2} fill="#3B3628" />
          <path d="M266 214 q8 10 0 20 M266 238 q6 8 0 14" fill="none" stroke="#FF647C" strokeWidth="2" />
          <circle cx={244} cy={270} r={4} fill={p > 0.95 ? '#54E6A5' : '#FFCA70'} />
        </g>
      )
    }
    case 'comms': {
      const lit = mode === 'celebrate' ? 4 : Math.floor(p * 4)
      return (
        <g className="part">
          <rect x={150} y={262} width={104} height={36} rx={6} fill={`url(#${id('metal')})`} stroke="#2A3050" strokeWidth="2" />
          {[0, 1, 2].map((i) => <circle key={i} cx={166 + i * 12} cy={280} r={3} fill={i < lit ? '#54E6A5' : '#1C2740'} />)}
          <rect x={196} y={212} width={10} height={52} fill="#4A5571" />
          <ellipse cx={204} cy={198} rx={46} ry={20} fill="#C7CFE0" stroke="#6B7A99" strokeWidth="2" transform="rotate(25 204 198)" />
          <ellipse cx={204} cy={198} rx={34} ry={13} fill="#9AA5BD" transform="rotate(25 204 198)" />
          <line x1={204} y1={198} x2={176} y2={170} stroke="#4A5571" strokeWidth="3" />
          <circle cx={176} cy={170} r={4.5} fill={lit ? '#36D9F5' : '#6B7A99'} />
          {[14, 24, 34, 44].map((r, i) => (
            <path key={r} d={`M${176 - r * 0.42} ${170 - r * 0.9} A ${r} ${r} 0 0 0 ${176 - r * 0.95} ${170 - r * 0.3}`} fill="none" stroke={i < lit ? '#36D9F5' : '#2A3050'} strokeWidth="3" strokeLinecap="round" className={i < lit ? 'wave-on' : ''} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </g>
      )
    }
    case 'shutdown':
      return (
        <g className="part">
          <rect x={150} y={270} width={104} height={28} rx={6} fill={`url(#${id('hazard')})`} stroke="#2A3050" strokeWidth="2" />
          <rect x={168} y={166} width={68} height={106} rx={30} fill="#0B1020" />
          <rect x={186} y={184} width={32} height={74} rx={16} fill={`url(#${id('core')})`} className={p < 0.5 ? 'core-hot' : 'core-cool'} />
          <rect x={168} y={166} width={68} height={106} rx={30} fill={`url(#${id('glass')})`} stroke="#6B7A99" strokeWidth="2" />
          <ellipse cx={202} cy={204} rx={36} ry={6} fill="none" stroke="#8C96B0" strokeWidth="3" />
          <ellipse cx={202} cy={244} rx={36} ry={6} fill="none" stroke="#8C96B0" strokeWidth="3" />
          <rect x={234} y={278} width={14} height={12} rx={2} fill="#1B1F33" stroke="#C7CFE0" />
          {p < 0.5 && mode !== 'idle' && <circle cx={202} cy={170} r={4} fill="#FF647C" className="alarm" />}
        </g>
      )
  }
}

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
