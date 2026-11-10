// Mission locations (original SVG). Each environment supplies a far backdrop
// (drawn out of focus), lights in front of it, its own work surface, effects in
// front of everything (rain, embers) and a colour grade that tints the scene.
// The visible room is x 0-480; the bench top starts at y 246.

import type { BenchMode, Id, MissionEnv } from './sceneTypes'


interface EnvProps {
  id: Id
  p: number
  mode: BenchMode
  full: boolean
}

export function EnvBackdrop({ env, ...props }: EnvProps & { env: MissionEnv }) {
  switch (env) {
    case 'vault':
      return <VaultBackdrop {...props} />
    case 'cleanroom':
      return <CleanroomBackdrop {...props} />
    case 'mainframe':
      return <MainframeBackdrop {...props} />
    case 'rooftop':
      return <RooftopBackdrop {...props} />
    case 'reactor':
      return <ReactorBackdrop {...props} />
  }
}

export function EnvBench({ env, ...props }: EnvProps & { env: MissionEnv }) {
  switch (env) {
    case 'vault':
      return <GrateDeck {...props} />
    case 'cleanroom':
      return <CleanBench {...props} />
    case 'mainframe':
      return <ConsoleDesk {...props} />
    case 'rooftop':
      return <WetDeck {...props} />
    case 'reactor':
      return <ReactorDeck {...props} />
  }
}

/** Effects drawn in front of the whole scene. */
export function EnvFront({ env, p, mode, full }: EnvProps & { env: MissionEnv }) {
  if (env === 'rooftop') return <Rain full={full} />
  if (env === 'reactor' && mode !== 'celebrate') return <Particles color="#FF9A3D" count={full ? 9 : 5} rising opacity={1 - p * 0.8} />
  if (env === 'vault') return <Particles color="#9CFF6B" count={full ? 7 : 4} rising={false} opacity={0.8} />
  if (env === 'mainframe') return <Particles color="#7FF0FF" count={full ? 7 : 4} rising={false} opacity={0.7} />
  return null
}

/* ===================================================== 01 POWER VAULT */

function VaultBackdrop({ id, full }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('vault-wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E211B" />
          <stop offset="100%" stopColor="#060B0D" />
        </linearGradient>
        <linearGradient id={id('vault-cell')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#13201E" />
          <stop offset="45%" stopColor="#3C504C" />
          <stop offset="100%" stopColor="#101A19" />
        </linearGradient>
        <linearGradient id={id('vault-cone')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC56A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFC56A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={480} height={340} fill={`url(#${id('vault-wall')})`} />
      {/* battery banks */}
      {Array.from({ length: 8 }, (_, i) => {
        const x = 6 + i * 60
        const top = 34 + (i % 3) * 16
        return (
          <g key={i}>
            <rect x={x} y={top} width={42} height={246 - top} rx={9} fill={`url(#${id('vault-cell')})`} stroke="#0A1211" strokeWidth="2" />
            <rect x={x + 6} y={top - 8} width={30} height={10} rx={3} fill="#2C3A38" />
            <rect x={x} y={top + 26} width={42} height={5} fill="#E0A84A" opacity="0.6" />
            <rect x={x} y={top + 34} width={42} height={2} fill="#E0A84A" opacity="0.4" />
            <rect x={x + 18} y={top + 48} width={6} height={150 - top} rx={3} fill="#54E6A5" opacity="0.55" className="cell-glow" style={{ animationDelay: `${i * 0.43}s` }} />
          </g>
        )
      })}
      {/* catwalk */}
      <rect x={0} y={122} width={480} height={7} fill="#1B2826" />
      <rect x={0} y={129} width={480} height={5} fill={`url(#${id('hazard')})`} opacity="0.7" />
      <line x1={0} x2={480} y1={98} y2={98} stroke="#2E4240" strokeWidth="3" />
      {Array.from({ length: 13 }, (_, i) => <line key={i} x1={i * 40} x2={i * 40} y1={98} y2={122} stroke="#2E4240" strokeWidth="2.5" />)}
      {/* conduits */}
      <path d="M0 18 C 120 30 180 6 300 18 S 440 30 480 16" fill="none" stroke="#24302F" strokeWidth="11" />
      {[60, 170, 320, 430].map((x) => <rect key={x} x={x} y={10} width={8} height={18} rx={2} fill="#E0A84A" opacity="0.7" />)}
      {/* caged work lights */}
      {[[70, 150], [418, 150]].map(([x, y]) => (
        <g key={x}>
          <polygon points={`${x - 8},${y} ${x + 8},${y} ${x + 60},246 ${x - 60},246`} fill={`url(#${id('vault-cone')})`} opacity="0.5" />
          <circle cx={x} cy={y} r={7} fill="#FFD48A" filter={`url(#${id('bloom')})`} />
          <path d={`M${x - 8} ${y} a8 8 0 0 1 16 0 M${x - 4} ${y - 7} v14 M${x + 4} ${y - 7} v14`} fill="none" stroke="#3A3020" strokeWidth="1.5" />
        </g>
      ))}
      {/* distant arc-welder flash on a maintenance gantry */}
      {full && <circle cx={356} cy={106} r={7} fill="#DFFBFF" filter={`url(#${id('bloom')})`} className="arc-flash" />}
    </g>
  )
}

function GrateDeck({ id, full }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('grate')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3D484B" />
          <stop offset="100%" stopColor="#141A1D" />
        </linearGradient>
        <pattern id={id('slats')} width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="none" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="#0C1113" strokeWidth="2.5" />
        </pattern>
      </defs>
      <polygon points="0,246 480,246 480,340 0,340" fill={`url(#${id('grate')})`} />
      <polygon points="0,246 480,246 480,340 0,340" fill={`url(#${id('slats')})`} opacity="0.7" />
      <rect x={0} y={246} width={480} height={7} fill={`url(#${id('hazard')})`} />
      <ellipse cx={206} cy={290} rx={190} ry={50} fill="#54E6A5" opacity="0.08" />
      {/* cables across the deck */}
      <path d="M0 318 C 80 300 140 330 220 316 S 380 300 480 322" fill="none" stroke="#0C0F12" strokeWidth="7" />
      <path d="M0 330 C 100 318 160 338 260 328" fill="none" stroke="#7A1E28" strokeWidth="5" />
      {full && (
        <g>
          {/* multimeter */}
          <rect x={404} y={280} width={42} height={32} rx={5} fill="#FFCA70" stroke="#1B1F33" strokeWidth="2" />
          <rect x={410} y={285} width={30} height={10} rx={2} fill="#1B2B22" />
          <text x={425} y={293} textAnchor="middle" fontSize="7" fill="#9CFF6B" className="crt-text">12.4V</text>
          <circle cx={425} cy={304} r={5} fill="#1B1F33" />
        </g>
      )}
    </g>
  )
}

/* ===================================================== 02 CLEANROOM */

function CleanroomBackdrop({ id, full }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('clean-wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8EEF8" />
          <stop offset="100%" stopColor="#A9B5CC" />
        </linearGradient>
        <linearGradient id={id('chamber')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DDF3FF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8FC6EC" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id={id('wafer')} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#D8C8FF" />
          <stop offset="50%" stopColor="#7AA7E8" />
          <stop offset="100%" stopColor="#3C4A6B" />
        </radialGradient>
      </defs>
      <rect width={480} height={340} fill={`url(#${id('clean-wall')})`} />
      <g stroke="#C2CCDF" strokeWidth="2">
        {[60, 120, 180, 240, 300, 360, 420].map((x) => <line key={x} x1={x} x2={x} y1={22} y2={246} />)}
        <line x1={0} x2={480} y1={70} y2={70} />
        <line x1={0} x2={480} y1={160} y2={160} />
      </g>
      {/* ceiling with UV sterilisation tubes */}
      <rect x={0} y={0} width={480} height={22} fill="#C8D2E4" />
      {[[30, 150], [300, 160]].map(([x, w]) => (
        <g key={x}>
          <rect x={x} y={24} width={w} height={6} rx={3} fill="#C49BFF" filter={`url(#${id('bloom')})`} className="uv" />
          <rect x={x - 10} y={30} width={w + 20} height={40} fill="#B784FF" opacity="0.12" />
        </g>
      ))}
      {/* ceiling rail with a precision robot arm */}
      <rect x={0} y={42} width={480} height={5} fill="#8994AE" />
      <g className="rail-arm">
        <rect x={104} y={38} width={26} height={14} rx={3} fill="#5D6A88" />
        <path d="M117 52 L108 88 L124 118" fill="none" stroke="#7D89A6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={108} cy={88} r={4} fill="#4C5875" />
        <path d="M118 118 l6 8 M130 118 l-6 8" stroke="#4C5875" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={124} cy={130} r={3} fill="#7FF0FF" filter={`url(#${id('bloom')})`} />
      </g>
      {/* glass containment chambers with wafers under blue LED spots */}
      {[[20, 96, 128, 120], [404, 86, 74, 130]].map(([x, y, w, h]) => (
        <g key={x}>
          <polygon points={`${x + w / 2 - 6},${y + 8} ${x + w / 2 + 6},${y + 8} ${x + w / 2 + 30},${y + h - 30} ${x + w / 2 - 30},${y + h - 30}`} fill="#7FD4FF" opacity="0.22" />
          <ellipse cx={x + w / 2} cy={y + h - 30} rx={Math.min(30, w / 2 - 8)} ry={7} fill={`url(#${id('wafer')})`} />
          <rect x={x + w / 2 - 4} y={y + h - 24} width={8} height={18} fill="#8994AE" />
          <rect x={x} y={y} width={w} height={h} rx={10} fill={`url(#${id('chamber')})`} stroke="#9FB3D4" strokeWidth="2" />
          <circle cx={x + w / 2} cy={y + 8} r={4} fill="#7FD4FF" filter={`url(#${id('bloom')})`} />
          <rect x={x + 6} y={y + 6} width={6} height={h - 12} rx={3} fill="#FFFFFF" opacity="0.5" />
        </g>
      ))}
      {full && <rect x={160} y={176} width={64} height={52} rx={4} fill="#DCE4F1" stroke="#B4C0D6" strokeWidth="2" />}
    </g>
  )
}

function CleanBench({ id, full }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('clean-desk')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2F5FB" />
          <stop offset="100%" stopColor="#A6B2C8" />
        </linearGradient>
        <pattern id={id('esd')} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0 H0 V12" fill="none" stroke="#7FB2FF" strokeOpacity="0.3" strokeWidth="1" />
        </pattern>
      </defs>
      <polygon points="0,246 480,246 480,340 0,340" fill={`url(#${id('clean-desk')})`} />
      <line x1={0} x2={480} y1={247} y2={247} stroke="#FFFFFF" strokeWidth="2" />
      <polygon points="84,256 318,256 334,318 66,318" fill="#2D5EA8" stroke="#5A8EDB" strokeWidth="1.5" />
      <polygon points="84,256 318,256 334,318 66,318" fill={`url(#${id('esd')})`} />
      {full && (
        <g>
          {/* IC tray and tweezers */}
          <rect x={372} y={282} width={56} height={30} rx={3} fill="#1B1F33" />
          {Array.from({ length: 8 }, (_, i) => <rect key={i} x={376 + (i % 4) * 13} y={286 + Math.floor(i / 4) * 13} width={9} height={9} rx={1} fill="#3A4560" />)}
          <path d="M20 322 L92 304 M22 326 L92 306" stroke="#8994AE" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

/* ===================================================== 03 MAINFRAME CORE */

const LED_COLORS = ['#36D9F5', '#54E6A5', '#FFCA70', '#36D9F5', '#FF4D5E']

function MainframeBackdrop({ id, full }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('mf-wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#081024" />
          <stop offset="100%" stopColor="#03050C" />
        </linearGradient>
        <linearGradient id={id('fog')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#BFEFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#BFEFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={480} height={340} fill={`url(#${id('mf-wall')})`} />
      {/* server racks */}
      {[6, 56, 106, 156, 404, 444].map((x, r) => (
        <g key={x}>
          <rect x={x} y={14} width={44} height={232} rx={3} fill="#0D1426" stroke="#1C2A48" strokeWidth="2" />
          {Array.from({ length: full ? 36 : 18 }, (_, i) => {
            const col = i % 3
            const row = Math.floor(i / 3)
            const on = (i * 7 + r * 3) % 5 !== 0
            return on ? <rect key={i} x={x + 7 + col * 12} y={24 + row * (full ? 17 : 34)} width={6} height={3} fill={LED_COLORS[(i + r) % 5]} className="led" style={{ animationDelay: `${((i * 13 + r * 7) % 20) / 10}s` }} /> : null
          })}
        </g>
      ))}
      {/* corrupted monitors scrolling hex dumps */}
      {[[206, 30, 56, 40], [410, 4, 60, 8]].slice(0, full ? 2 : 1).map(([x, y, w, h], m) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={h || 40} rx={3} fill="#1A0408" stroke="#3A1018" strokeWidth="2" />
          {h > 20 && (
            <g className="hex-scroll" style={{ animationDelay: `${m * 0.6}s` }}>
              {['FF 3A 0D', 'ERR 0x7F', 'C0 DE 00', 'MEM FAIL', 'AB 12 9E'].map((t, i) => (
                <text key={t} x={x + 5} y={y + 10 + i * 8} fontSize="6.5" fill="#FF4D5E" className="crt-text">{t}</text>
              ))}
            </g>
          )}
        </g>
      ))}
      {/* liquid-nitrogen coolant tubes */}
      {[212, 228].map((x, i) => (
        <g key={x}>
          <rect x={x} y={70} width={10} height={176} rx={5} fill="#BFEFFF" opacity="0.12" stroke="#7FD4FF" strokeOpacity="0.4" />
          <line x1={x + 5} x2={x + 5} y1={74} y2={242} stroke="#9FEFFF" strokeWidth="4" strokeDasharray="8 10" className="coolant" style={{ animationDelay: `${i * 0.3}s` }} />
        </g>
      ))}
      <rect x={0} y={186} width={480} height={64} fill={`url(#${id('fog')})`} className="fog" />
    </g>
  )
}

function ConsoleDesk({ id, full }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('desk-metal')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1F2A3E" />
          <stop offset="100%" stopColor="#0A0F19" />
        </linearGradient>
      </defs>
      <polygon points="0,246 480,246 480,340 0,340" fill={`url(#${id('desk-metal')})`} />
      <line x1={0} x2={480} y1={248} y2={248} stroke="#36D9F5" strokeWidth="2.5" filter={`url(#${id('bloom')})`} className="desk-strip" />
      <g stroke="#060A12" strokeWidth="2">
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1={20 + i * 40} x2={20 + i * 40 + 20} y1={330} y2={330} />)}
      </g>
      <ellipse cx={206} cy={300} rx={200} ry={44} fill="#36D9F5" opacity="0.07" />
      {full && (
        <g>
          {/* data drives */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={372 + i * 22} y={290 - i * 2} width={18} height={26} rx={2} fill="#2A3350" stroke="#14172A" />
              <circle cx={381 + i * 22} cy={296 - i * 2} r={1.8} fill={i === 1 ? '#FF4D5E' : '#54E6A5'} />
            </g>
          ))}
        </g>
      )}
    </g>
  )
}

/* ===================================================== 04 RAINY ROOFTOP */

const SKYLINE: [number, number, number][] = [
  [0, 40, 90], [36, 30, 120], [62, 44, 70], [100, 26, 140], [124, 40, 96], [160, 34, 150], [190, 30, 110],
  [218, 38, 130], [252, 28, 100], [276, 42, 160], [314, 30, 120], [340, 40, 140], [376, 28, 100], [400, 44, 170], [440, 40, 120],
]

function RooftopBackdrop({ id, full }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('roof-sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B0820" />
          <stop offset="55%" stopColor="#3A1450" />
          <stop offset="100%" stopColor="#C2457A" />
        </linearGradient>
        <linearGradient id={id('searchlight')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8F6FF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#E8F6FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={480} height={340} fill={`url(#${id('roof-sky')})`} />
      {/* smog */}
      <ellipse cx={120} cy={170} rx={180} ry={30} fill="#FF7AB8" opacity="0.18" />
      <ellipse cx={380} cy={150} rx={160} ry={26} fill="#A78BFA" opacity="0.16" className="smog" />
      {/* far skyline */}
      {SKYLINE.map(([x, w, h], i) => (
        <g key={x}>
          <rect x={x} y={232 - h} width={w} height={h} fill={i % 2 ? '#1A1035' : '#140C2C'} />
          {full && Array.from({ length: Math.floor(h / 18) }, (_, row) => ((row + i) % 3 === 0 ? null : (
            <rect key={row} x={x + 6 + (row % 2) * (w / 2 - 6)} y={240 - h + row * 18} width={4} height={5} fill={(row + i) % 4 ? '#FFCA70' : '#36D9F5'} opacity="0.7" />
          )))}
        </g>
      ))}
      {/* holographic spire */}
      <polygon points="330,8 336,8 352,232 314,232" fill="#36D9F5" opacity="0.18" />
      <line x1={333} x2={333} y1={8} y2={232} stroke="#7FF0FF" strokeWidth="2" filter={`url(#${id('bloom')})`} />
      {[60, 110, 160].map((y) => <ellipse key={y} cx={333} cy={y} rx={12 + y / 16} ry={3} fill="none" stroke="#7FF0FF" strokeOpacity="0.6" className="spire-ring" />)}
      {/* neon billboards */}
      <rect x={30} y={58} width={70} height={34} rx={3} fill="#FF4FB8" opacity="0.85" filter={`url(#${id('bloom')})`} className="neon" />
      <rect x={38} y={66} width={40} height={4} fill="#FFFFFF" opacity="0.8" />
      <rect x={38} y={76} width={54} height={4} fill="#FFFFFF" opacity="0.6" />
      <rect x={416} y={40} width={12} height={80} rx={2} fill="#36D9F5" opacity="0.8" filter={`url(#${id('bloom')})`} />
      {/* aerocar with a sweeping searchlight */}
      <g className="aerocar">
        <polygon points="140,44 148,44 120,232 40,232" fill={`url(#${id('searchlight')})`} className="searchlight" />
        <rect x={132} y={38} width={24} height={8} rx={4} fill="#2A2350" />
        <circle cx={154} cy={42} r={2.5} fill="#FF4D5E" />
      </g>
      {/* rooftop satellite dish and relay tower */}
      <g fill="#0E0920">
        <ellipse cx={58} cy={176} rx={44} ry={18} transform="rotate(-30 58 176)" />
        <rect x={52} y={186} width={10} height={46} />
        <path d="M440 232 L452 56 L464 232 Z M444 180 h16 M446 130 h12 M448 90 h8" stroke="#0E0920" strokeWidth="3" fill="none" />
      </g>
      <circle cx={452} cy={54} r={4} fill="#FF4D5E" filter={`url(#${id('bloom')})`} className="alarm" />
      {/* guard rail */}
      <line x1={0} x2={480} y1={214} y2={214} stroke="#2A2350" strokeWidth="4" />
      {Array.from({ length: 13 }, (_, i) => <line key={i} x1={i * 40} x2={i * 40} y1={214} y2={246} stroke="#2A2350" strokeWidth="3" />)}
    </g>
  )
}

function WetDeck({ id }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('wet')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2340" />
          <stop offset="100%" stopColor="#0C0A18" />
        </linearGradient>
        <linearGradient id={id('puddle')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF4FB8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#36D9F5" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <polygon points="0,246 480,246 480,340 0,340" fill={`url(#${id('wet')})`} />
      <g stroke="#3A3058" strokeWidth="1.5">
        <line x1={0} x2={480} y1={272} y2={272} />
        <line x1={0} x2={480} y1={304} y2={304} />
        {[80, 200, 320, 440].map((x) => <line key={x} x1={x} x2={x - 20} y1={246} y2={340} />)}
      </g>
      {/* neon reflections in the puddles */}
      <ellipse cx={60} cy={300} rx={50} ry={9} fill={`url(#${id('puddle')})`} className="puddle" />
      <ellipse cx={392} cy={316} rx={62} ry={10} fill={`url(#${id('puddle')})`} className="puddle p2" />
      <rect x={40} y={250} width={6} height={44} fill="#FF4FB8" opacity="0.15" />
      <rect x={420} y={250} width={5} height={60} fill="#36D9F5" opacity="0.15" />
    </g>
  )
}

function Rain({ full }: { full: boolean }) {
  const drops = full ? 70 : 34
  return (
    <g className="rain" pointerEvents="none">
      {Array.from({ length: drops }, (_, i) => {
        const x = (i * 53) % 500 - 10
        const y = (i * 97) % 340
        return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 14} stroke="#B9C8FF" strokeOpacity="0.35" strokeWidth="1.2" className="drop" style={{ animationDelay: `${(i % 10) * -0.07}s` }} />
      })}
      {full && [60, 150, 300, 410].map((x, i) => <ellipse key={x} cx={x} cy={290 + (i % 2) * 20} rx={6} ry={1.6} fill="none" stroke="#B9C8FF" strokeOpacity="0.5" className="splash" style={{ animationDelay: `${i * 0.23}s` }} />)}
    </g>
  )
}

/* ===================================================== 05 MELTDOWN CHAMBER */

function ReactorBackdrop({ id, p, mode, full }: EnvProps) {
  const safe = mode === 'celebrate' || p >= 0.999
  const hex = (cx: number, cy: number, r: number) => Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
  return (
    <g>
      <defs>
        <linearGradient id={id('reactor-wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E070B" />
          <stop offset="100%" stopColor="#090306" />
        </linearGradient>
        <radialGradient id={id('plasma')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor={safe ? '#9FE8FF' : '#FFD27A'} />
          <stop offset="70%" stopColor={safe ? '#3A7BFF' : '#FF4D2E'} />
          <stop offset="100%" stopColor={safe ? '#3A7BFF' : '#FF4D2E'} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('strobe')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF3B3B" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF3B3B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={480} height={340} fill={`url(#${id('reactor-wall')})`} />
      {/* bulkhead plates */}
      <g stroke="#2A1218" strokeWidth="2" fill="none">
        {[0, 120, 240, 360].map((x) => <rect key={x} x={x + 4} y={18} width={112} height={214} rx={4} />)}
      </g>
      {/* plasma sphere behind a hexagonal blast shield */}
      <polygon points={hex(132, 112, 84)} fill="#0A0306" />
      <circle cx={132} cy={112} r={50} fill={`url(#${id('plasma')})`} className="plasma" opacity={1 - p * 0.35} />
      {!safe && (
        <g className="plasma-swirl" style={{ transformOrigin: '132px 112px' }}>
          <path d="M98 112 A 34 34 0 0 1 166 112" fill="none" stroke="#FFE3A3" strokeWidth="2" opacity="0.7" />
          <path d="M108 128 A 26 26 0 0 0 156 96" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" />
        </g>
      )}
      <polygon points={hex(132, 112, 84)} fill="none" stroke="#3A2A34" strokeWidth="12" />
      <polygon points={hex(132, 112, 70)} fill="none" stroke="#FF8A5C" strokeOpacity="0.25" strokeWidth="2" />
      {/* overhead countdown */}
      <rect x={404} y={28} width={70} height={26} rx={3} fill="#120306" stroke="#3A1018" strokeWidth="2" />
      <text x={439} y={46} textAnchor="middle" fontSize="13" fill={safe ? '#54E6A5' : '#FF4D5E'} filter={`url(#${id('bloom')})`} className={`crt-text ${safe ? '' : 'countdown'}`}>{safe ? 'SAFE' : 'T-00:42'}</text>
      {/* pressure valves venting steam */}
      <rect x={404} y={126} width={76} height={12} fill="#3A2A34" />
      <circle cx={420} cy={132} r={10} fill="none" stroke="#C26A2E" strokeWidth="3" />
      {!safe && full && (
        <g className="steam-jet">
          <circle cx={404} cy={130} r={8} /><circle cx={394} cy={124} r={10} /><circle cx={384} cy={116} r={12} />
        </g>
      )}
      <rect x={0} y={236} width={480} height={10} fill={`url(#${id('hazard')})`} opacity="0.8" />
      {/* rotating emergency strobes */}
      {[[40, 12], [300, 12]].map(([x, y], i) => (
        <g key={x}>
          {!safe && <polygon points={`${x},${y} ${x - 70},246 ${x + 70},246`} fill={`url(#${id('strobe')})`} className="strobe" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${i * 0.6}s` }} />}
          <circle cx={x} cy={y} r={7} fill={safe ? '#54E6A5' : '#FF3B3B'} filter={`url(#${id('bloom')})`} className={safe ? '' : 'alarm'} />
        </g>
      ))}
    </g>
  )
}

function ReactorDeck({ id, p }: EnvProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('steel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A3640" />
          <stop offset="100%" stopColor="#120F16" />
        </linearGradient>
      </defs>
      <polygon points="0,246 480,246 480,340 0,340" fill={`url(#${id('steel')})`} />
      <rect x={0} y={246} width={480} height={8} fill={`url(#${id('hazard')})`} />
      <g stroke="#0C0A10" strokeWidth="2">
        {[60, 160, 260, 360, 460].map((x) => <circle key={x} cx={x} cy={320} r={3} fill="#4A4552" />)}
      </g>
      <ellipse cx={206} cy={292} rx={190} ry={48} fill="#FF4D2E" opacity={0.14 * (1 - p)} />
      {p > 0.7 && <polygon points="0,254 480,254 480,340 0,340" fill="#BFEFFF" opacity={(p - 0.7) * 0.5} />}
    </g>
  )
}

/* ===================================================== shared particles */

function Particles({ color, count, rising, opacity }: { color: string; count: number; rising: boolean; opacity: number }) {
  return (
    <g className={`particles ${rising ? 'rising' : 'drifting'}`} opacity={opacity} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={30 + ((i * 61) % 420)} cy={rising ? 240 + (i % 3) * 20 : 80 + ((i * 37) % 150)} r={i % 3 === 0 ? 1.8 : 1.2} fill={color} style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
    </g>
  )
}
