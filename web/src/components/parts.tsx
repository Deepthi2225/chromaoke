// The part Tek repairs in each mission. `p` (0-1) is repair progress; `hits`
// increments on every correct key so a part can react to individual keystrokes.

import type { MissionId } from '../data/missions'
import type { BenchMode, Id } from './sceneTypes'

interface PartProps {
  mission: MissionId
  p: number
  id: Id
  mode: BenchMode
  slipping: boolean
  hits: number
}

export function Part(props: PartProps) {
  switch (props.mission) {
    case 'battery':
      return <Battery {...props} />
    case 'circuit':
      return <Circuit {...props} />
    case 'code':
      return <Terminal {...props} />
    case 'comms':
      return <Dish {...props} />
    case 'shutdown':
      return <Coolant {...props} />
  }
}

const active = (mode: BenchMode) => mode === 'weld' || mode === 'demo'

/* Mission 01: a cracked power cell leaking electrolyte vapour. */
function Battery({ p, id, mode, hits }: PartProps) {
  const bloom = `url(#${id('bloom')})`
  const lit = Math.ceil(p * 5 - 0.001)
  const color = p < 0.35 ? '#FF4D5E' : p < 0.7 ? '#FFCA70' : '#9CFF6B'
  const lead = 'M186 170 C 150 176 110 214 92 258'
  return (
    <g className="part">
      <path d={lead} fill="none" stroke="#C26A2E" strokeWidth="4" />
      {/* every correct key sends a pulse of clean energy down the copper lead */}
      {mode === 'weld' && hits > 0 && <path key={`pulse-${hits}`} d={lead} pathLength={100} fill="none" stroke="#9CFF6B" strokeWidth="5" strokeLinecap="round" filter={bloom} className="lead-pulse" />}
      {mode === 'demo' && <path d={lead} pathLength={100} fill="none" stroke="#9CFF6B" strokeWidth="5" strokeLinecap="round" filter={bloom} className="lead-pulse loop" />}
      <path d="M218 170 C 262 168 270 210 300 256" fill="none" stroke="#2A2547" strokeWidth="4" />
      <rect x={86} y={254} width={14} height={8} rx={2} fill="#C26A2E" />
      <rect x={160} y={168} width={86} height={130} rx={18} fill={`url(#${id('metal')})`} stroke="#252C44" strokeWidth="3" />
      <rect x={160} y={186} width={86} height={14} fill="#54E6A5" opacity="0.45" />
      <rect x={186} y={154} width={34} height={16} rx={5} fill="#9AA5BD" stroke="#252C44" strokeWidth="2" />
      <path d="M198 162 h10 M203 157 v10" stroke="#252C44" strokeWidth="2.5" strokeLinecap="round" />
      <rect x={176} y={206} width={54} height={78} rx={9} fill="#070B16" stroke="#252C44" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={182} y={270 - i * 15} width={42} height={11} rx={3} fill={i < lit ? color : '#1A1F2E'} filter={i < lit ? bloom : undefined} className={i < lit ? 'cell-on' : ''} />
      ))}
      {lit === 0 && <path d="M207 222 l-10 20 h10 l-6 18 l16 -24 h-10 l6 -14z" fill="#FF4D5E" filter={bloom} className="empty-bolt" />}
      {/* the crack seals with a glowing energy seam as the repair progresses */}
      <path d="M232 172 l-8 14 l7 6 l-9 16" fill="none" stroke="#1A1F2E" strokeWidth="3" opacity={1 - p} />
      <path d="M232 172 l-8 14 l7 6 l-9 16" fill="none" stroke="#9CFF6B" strokeWidth="2" filter={bloom} opacity={p} />
      <rect x={166} y={176} width={8} height={110} rx={4} fill="#FFFFFF" opacity="0.25" />
      <rect x={244} y={204} width={10} height={22} rx={2} fill="#14172A" stroke="#C9D2E6" strokeWidth="1.5" />
      {p < 1 && (
        <g opacity={1 - p} className="vapour">
          <path d="M226 168 q-8 -12 0 -22 q8 -10 0 -22" fill="none" stroke="#C8F7B0" strokeWidth="3" strokeLinecap="round" className="steam" />
          <path d="M236 170 q-6 -10 0 -18 q6 -8 0 -18" fill="none" stroke="#C8F7B0" strokeWidth="2.5" strokeLinecap="round" className="steam s2" />
        </g>
      )}
      {active(mode) && <path d="M190 152 l-8 -7 l6 -2 l-8 -9 M216 152 l8 -7 l-6 -2 l8 -9" fill="none" stroke="#C8FFB0" strokeWidth="2.2" filter={bloom} className="arc" />}
    </g>
  )
}

/* Mission 02: a burned logic board with severed traces and scorched chips. */
function Circuit({ p, id, mode }: PartProps) {
  const bloom = `url(#${id('bloom')})`
  const traces = ['M110 296 H146 L156 286', 'M188 282 H210', 'M238 288 H266 L278 300', 'M168 270 L178 262 H238', 'M250 268 H266 L274 280', 'M132 274 H150']
  const done = p >= 0.999
  return (
    <g className="part">
      <polygon points="88,304 304,304 304,312 88,312" fill="#0E2E24" />
      <polygon points="106,258 286,258 304,304 88,304" fill={`url(#${id('pcb')})`} stroke="#3AA383" strokeWidth="2" />
      {[[112, 300], [296, 300], [116, 264], [278, 264]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={3} fill="#0E2E24" stroke="#E0A84A" strokeWidth="1.5" />)}
      {traces.map((d) => <path key={d} d={d} fill="none" stroke="#2E6E57" strokeWidth="3.2" strokeLinecap="round" />)}
      {traces.map((d) => (
        <path key={`lit-${d}`} d={d} pathLength={100} fill="none" stroke="#7FF0FF" strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${p * 100} 100`} filter={bloom} className="trace-lit" />
      ))}
      {/* once restored, current sweeps across the board like flowing water */}
      {done && traces.map((d) => <path key={`flow-${d}`} d={d} pathLength={100} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" className="trace-flow" />)}
      {/* scorch marks fade as the repair progresses */}
      <g opacity={(1 - p) * 0.85}>
        <ellipse cx={196} cy={284} rx={22} ry={8} fill="#0A0806" opacity="0.7" />
        <ellipse cx={262} cy={292} rx={14} ry={5} fill="#0A0806" opacity="0.6" />
        <ellipse cx={140} cy={278} rx={12} ry={4} fill="#0A0806" opacity="0.6" />
      </g>
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
      {/* capacitors snap upright as the board comes back */}
      <g transform={`rotate(${(1 - p) * 28} 256 262)`}>
        <rect x={250} y={240} width={12} height={22} rx={4} fill="#A78BFA" />
        <ellipse cx={256} cy={240} rx={6} ry={2.5} fill="#D9CCFF" />
      </g>
      <g transform={`rotate(${-(1 - p) * 22} 133 266)`}>
        <rect x={128} y={248} width={10} height={18} rx={4} fill="#FFCA70" />
        <ellipse cx={133} cy={248} rx={5} ry={2} fill="#FFE3A3" />
      </g>
      <g transform="translate(176 296)">
        <rect width={18} height={6} rx={3} fill="#D7C39A" />
        <rect x={4} width={2} height={6} fill="#FF647C" />
        <rect x={9} width={2} height={6} fill="#14172A" />
        <rect x={13} width={2} height={6} fill="#E0A84A" />
      </g>
      <circle cx={268} cy={292} r={4} fill={done ? '#54E6A5' : '#FF647C'} filter={bloom} className="status-led" />
      {active(mode) && <path d="M198 272 q-5 -10 0 -18 q5 -8 0 -16" fill="none" stroke="#E8E6F5" strokeOpacity="0.5" strokeWidth="2" className="steam" />}
    </g>
  )
}

const HEX = ['0xDEAD 7F3A', 'SEGFAULT 0x0', 'ERR 4F:2C:91', 'NULL PTR @3A', '0xBAAD F00D', 'STACK OVRFLW', 'PANIC 0x7E']

/* Mission 03: a phosphor CRT wired to an open neural processor. */
function Terminal({ p, id, mode, slipping }: PartProps) {
  const bloom = `url(#${id('bloom')})`
  const fixed = Math.floor(p * 7)
  const widths = [72, 50, 82, 44, 66, 58, 76]
  const colors = ['#54E6A5', '#7FF0FF', '#54E6A5', '#FFCA70', '#54E6A5', '#A78BFA', '#54E6A5']
  const stable = p >= 0.999
  return (
    <g className="part">
      {/* keyboard */}
      <polygon points="150,300 254,300 262,312 142,312" fill="#BDB49A" stroke="#7E765E" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={152 + i * 11} y={302} width={8} height={4} rx={1} fill="#8E8670" />)}
      <rect x={180} y={280} width={46} height={16} rx={3} fill="#8E8670" />
      {/* CRT */}
      <rect x={136} y={164} width={134} height={120} rx={16} fill={`url(#${id('crt')})`} stroke="#6E6650" strokeWidth="3" />
      <rect x={148} y={176} width={110} height={84} rx={12} fill={`url(#${id('screen')})`} stroke="#3B3628" strokeWidth="3" />
      {stable ? (
        <g filter={bloom}>
          <text x={203} y={214} textAnchor="middle" className="crt-text" fill="#7FF0FF" fontSize="10">SYS_STABLE</text>
          <text x={203} y={230} textAnchor="middle" className="crt-text" fill="#7FF0FF" fontSize="9">0 ERRORS</text>
          <rect x={196} y={238} width={14} height={5} fill="#7FF0FF" className="cursor" />
        </g>
      ) : (
        <>
          <g filter={bloom}>
            {widths.slice(0, fixed).map((w, i) => (
              <rect key={i} x={158 + (i % 3 === 1 ? 8 : 0)} y={186 + i * 9.5} width={w} height={4} rx={1} fill={colors[i]} opacity={0.85} />
            ))}
            <rect x={158} y={186 + fixed * 9.5} width={7} height={6} fill="#54E6A5" className="cursor" />
          </g>
          {/* corrupted rows still waiting to be debugged */}
          {HEX.slice(fixed + 1).map((t, i) => (
            <text key={t} x={158} y={192 + (fixed + 1 + i) * 9.5} className={`crt-text hex ${i % 2 ? 'h2' : ''}`} fill="#FF4D5E" fontSize="7">{t}</text>
          ))}
        </>
      )}
      <rect x={148} y={176} width={110} height={84} rx={12} fill={`url(#${id('scanlines')})`} />
      {!stable && <rect x={148} y={176} width={110} height={84} rx={12} fill="#FF647C" opacity={slipping ? 0.38 : 0.05} className="crt-glitch" />}
      <path d="M156 182 Q200 176 248 182" fill="none" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="3" />
      <circle cx={240} cy={272} r={4} fill="#8E8670" />
      <circle cx={252} cy={272} r={4} fill="#8E8670" />
      <circle cx={152} cy={272} r={3.5} fill={stable ? '#54E6A5' : '#FFCA70'} filter={bloom} />
      {/* open neural processor on the side */}
      <rect x={266} y={196} width={14} height={62} rx={2} fill="#2A2F4C" stroke="#14172A" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={269} y={202 + i * 13} width={8} height={8} rx={1} fill={i < fixed / 2 ? '#A78BFA' : '#3A3560'} filter={i < fixed / 2 ? bloom : undefined} />)}
      {mode === 'fail' && <rect x={148} y={176} width={110} height={84} rx={12} fill="#FF4D5E" opacity="0.25" />}
    </g>
  )
}

/* Mission 04: a misaligned transmitter dish with frayed fibre-optic bundles. */
function Dish({ p, id, mode }: PartProps) {
  const bloom = `url(#${id('bloom')})`
  const lit = mode === 'celebrate' ? 4 : Math.floor(p * 4)
  const tilt = 55 - 30 * p // swings from misaligned (55 deg) to locked on target (25 deg)
  const normal = ((-110 - tilt) * Math.PI) / 180
  const feed = { x: 204 + Math.cos(normal) * 42, y: 198 + Math.sin(normal) * 42 }
  const beacon = mode === 'celebrate' || p >= 0.999
  return (
    <g className="part">
      {beacon && <polygon points={`${feed.x - 6},${feed.y} ${feed.x + 6},${feed.y} ${feed.x + 40},0 ${feed.x - 40},0`} fill={`url(#${id('beacon')})`} className="beacon" />}
      <rect x={148} y={262} width={110} height={40} rx={7} fill={`url(#${id('metal')})`} stroke="#252C44" strokeWidth="2" />
      {[0, 1, 2].map((i) => <circle key={i} cx={164 + i * 13} cy={282} r={3.5} fill={i < lit ? '#54E6A5' : '#18213A'} filter={i < lit ? bloom : undefined} />)}
      <g stroke="#363F58" strokeWidth="2">
        {[0, 1, 2, 3].map((i) => <line key={i} x1={212 + i * 8} x2={212 + i * 8} y1={272} y2={292} />)}
      </g>
      {/* fibre bundle: frayed and dark at first, synced gold when aligned */}
      <path d="M232 262 C 232 240 214 230 208 214" fill="none" stroke={p > 0.5 ? '#FFCA70' : '#3A4560'} strokeWidth="3" filter={p > 0.5 ? bloom : undefined} strokeDasharray={p > 0.5 ? '6 5' : undefined} className={p > 0.5 ? 'fibre-flow' : ''} />
      <g opacity={1 - p} fill="none" strokeWidth="1.6" strokeLinecap="round">
        <path d="M240 262 q8 -6 4 -14 q-4 -6 4 -10" stroke="#FF647C" />
        <path d="M244 264 q10 -2 12 -10" stroke="#7FF0FF" />
        <path d="M236 262 q2 -10 -6 -14" stroke="#FFCA70" />
      </g>
      <rect x={198} y={214} width={12} height={50} fill="#4A5571" />
      <rect x={198} y={214} width={4} height={50} fill="#9AA5BD" opacity="0.5" />
      <g transform={`rotate(${tilt} 204 198)`}>
        <ellipse cx={204} cy={198} rx={48} ry={21} fill={`url(#${id('dish')})`} stroke="#5D6A88" strokeWidth="2" />
        <ellipse cx={204} cy={198} rx={36} ry={14} fill="#AEB8CE" />
      </g>
      <line x1={204} y1={198} x2={feed.x} y2={feed.y} stroke="#4A5571" strokeWidth="3.5" />
      <circle cx={feed.x} cy={feed.y} r={5} fill={lit ? '#7FF0FF' : '#6B7A99'} filter={lit ? bloom : undefined} />
      {[14, 25, 36, 47].map((r, i) => (
        <path key={r} d={`M${feed.x - r * 0.42} ${feed.y - r * 0.9} A ${r} ${r} 0 0 0 ${feed.x - r * 0.95} ${feed.y - r * 0.3}`} fill="none" stroke={i < lit ? '#7FF0FF' : '#2A3050'} strokeWidth="3.2" strokeLinecap="round" filter={i < lit ? bloom : undefined} className={i < lit ? 'wave-on' : ''} style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </g>
  )
}

/* Mission 05: a coolant control assembly and pressure dampener stuck in an overheat loop. */
function Coolant({ p, id, mode, hits }: PartProps) {
  const bloom = `url(#${id('bloom')})`
  const needle = 60 - 120 * p // pressure needle sweeps from the red zone to green
  const piston = 34 * (1 - p) // dampener rod is driven down as pressure falls
  const hot = p < 0.5 && mode !== 'idle' && mode !== 'celebrate'
  return (
    <g className="part">
      <path d="M168 214 H140 V292" fill="none" stroke="#4A5571" strokeWidth="7" />
      <path d="M236 214 H262 V246" fill="none" stroke="#4A5571" strokeWidth="7" />
      {/* pressure dampener */}
      <rect x={254} y={180 + piston} width={16} height={8} rx={2} fill="#C9D2E6" />
      <rect x={259} y={188 + piston} width={6} height={58 - piston} fill="#9AA5BD" />
      <rect x={250} y={232} width={24} height={40} rx={4} fill={`url(#${id('metal')})`} stroke="#252C44" strokeWidth="2" />
      <rect x={148} y={270} width={110} height={30} rx={6} fill={`url(#${id('hazard')})`} stroke="#252C44" strokeWidth="2" />
      {/* reactor core: red-hot to cryogenic blue */}
      <rect x={166} y={162} width={72} height={110} rx={32} fill="#070912" />
      <rect x={184} y={180} width={36} height={76} rx={18} fill={`url(#${id('core')})`} filter={bloom} className={hot ? 'core-hot' : 'core-cool'} />
      <ellipse cx={202} cy={218} rx={14} ry={4} fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.5" className="core-swirl" />
      <rect x={166} y={162} width={72} height={110} rx={32} fill={`url(#${id('glass')})`} stroke="#7D89A6" strokeWidth="2" />
      {/* frost creeps over the glass as it cools */}
      {p > 0.6 && <rect x={166} y={162} width={72} height={110} rx={32} fill={`url(#${id('frost')})`} opacity={Math.min(1, (p - 0.6) * 2.5)} />}
      <rect x={174} y={172} width={8} height={88} rx={4} fill="#FFFFFF" opacity="0.28" />
      <ellipse cx={202} cy={200} rx={38} ry={6} fill="none" stroke="#9AA5BD" strokeWidth="3.5" />
      <ellipse cx={202} cy={242} rx={38} ry={6} fill="none" stroke="#9AA5BD" strokeWidth="3.5" />
      <rect x={236} y={278} width={16} height={14} rx={2} fill="#14172A" stroke="#C9D2E6" />
      {/* pressure gauge */}
      <g transform="translate(128 238)">
        <circle r={15} fill="#E7E1D2" stroke="#252C44" strokeWidth="3" />
        <path d="M-11 6 A 12 12 0 0 1 -6 -10" fill="none" stroke="#54E6A5" strokeWidth="3" />
        <path d="M6 -10 A 12 12 0 0 1 11 6" fill="none" stroke="#FF4D5E" strokeWidth="3" />
        <line x1={0} y1={0} x2={0} y2={-11} stroke="#14172A" strokeWidth="2" strokeLinecap="round" transform={`rotate(${needle})`} className="needle" />
        <circle r={2.5} fill="#14172A" />
      </g>
      {/* cryo-foam bursts with every correct key */}
      {mode === 'weld' && hits > 0 && (
        <g key={`cryo-${hits}`} className="cryo" transform="translate(202 258)">
          <circle cx={-10} cy={0} r={7} /><circle cx={0} cy={-4} r={8} /><circle cx={10} cy={0} r={6} />
        </g>
      )}
      {/* warning beacon */}
      <rect x={194} y={150} width={16} height={12} rx={3} fill="#252C44" />
      <circle cx={202} cy={150} r={6} fill={hot ? '#FF4D5E' : '#54E6A5'} filter={bloom} className={hot ? 'alarm' : ''} />
    </g>
  )
}
