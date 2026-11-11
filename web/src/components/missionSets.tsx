// The five mission sets (original SVG, 640 x 360). Each set has a background,
// the furniture Tek works behind, the part being repaired and optional
// foreground effects. Tek himself is posed by MissionScene.

import type { BenchMode, Id } from './sceneTypes'

export interface SceneProps {
  id: Id
  /** Repair progress 0-1. */
  p: number
  mode: BenchMode
  /** Increments on every correct key. */
  hits: number
  slipping: boolean
  full: boolean
}

const working = (mode: BenchMode) => mode === 'weld' || mode === 'demo'
const done = (p: number, mode: BenchMode) => mode === 'celebrate' || p >= 0.999

/** Small floating hologram panel, like the DIAGNOSTICS screens in the concept art. */
export function HoloPanel({ x, y, w, h, title, color = '#36D9F5' }: { x: number; y: number; w: number; h: number; title: string; color?: string }) {
  return (
    <g className="holo-float">
      <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.8" strokeWidth="1" />
      <path d={`M${x} ${y + 6} V${y} H${x + 6} M${x + w - 6} ${y + h} H${x + w} V${y + h - 6}`} fill="none" stroke={color} strokeWidth="2" />
      <text x={x + 5} y={y + 9} fontSize="6" fill={color} className="crt-text">{title}</text>
      {[0, 1, 2].map((i) => <rect key={i} x={x + 5} y={y + 14 + i * 5} width={w * (0.7 - i * 0.15)} height={1.6} fill={color} opacity="0.7" />)}
    </g>
  )
}

/** Lightning arcs whose shape changes with every keystroke. */
function Arcs({ cx, cy, seed, color, r = 38 }: { cx: number; cy: number; seed: number; color: string; r?: number }) {
  return (
    <g className="arc" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
      {[0, 1, 2, 3].map((i) => {
        const a = ((seed * 61 + i * 97) % 360) * (Math.PI / 180)
        const pts = Array.from({ length: 5 }, (_, k) => {
          const t = (k + 1) / 5
          const j = ((seed + i * 3 + k * 7) % 5) - 2
          return `${cx + Math.cos(a) * r * t + j * 3},${cy + Math.sin(a) * r * t * 0.6 - j * 3}`
        })
        return <polyline key={i} points={`${cx},${cy} ${pts.join(' ')}`} />
      })}
    </g>
  )
}

/* ================================================================ 01 BATTERY */

export function BatteryBack({ id, full }: SceneProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('b-wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33230F" />
          <stop offset="100%" stopColor="#120F0A" />
        </linearGradient>
        <linearGradient id={id('b-cab')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1A1E18" />
          <stop offset="100%" stopColor="#30342A" />
        </linearGradient>
      </defs>
      <rect width={640} height={360} fill="#0F0C08" />
      {/* ceiling with amber light strips */}
      <polygon points="0,0 640,0 560,46 170,46" fill="#1B140B" />
      <polygon points="40,6 300,6 290,16 70,16" fill="#FFB24A" filter={`url(#${id('bloom')})`} className="strip" />
      <polygon points="380,10 610,6 586,18 392,20" fill="#FFB24A" filter={`url(#${id('bloom')})`} className="strip s2" />
      {/* back wall with a glowing hex door */}
      <rect x={170} y={46} width={390} height={236} fill={`url(#${id('b-wall')})`} />
      <polygon points="330,96 400,96 424,150 400,232 330,232 306,150" fill="#0A1A12" stroke="#3A3424" strokeWidth="6" />
      <polygon points="340,108 390,108 410,150 390,220 340,220 320,150" fill="#54E6A5" opacity="0.16" />
      {/* left wall: battery banks in perspective */}
      <polygon points="0,0 170,46 170,282 0,360" fill="#17130C" />
      {[0, 1, 2].map((i) => {
        const x0 = 10 + i * 52
        const x1 = x0 + 44
        const top0 = 70 + i * 14
        const top1 = 80 + i * 14
        const bot0 = 330 - i * 18
        const bot1 = 318 - i * 18
        return (
          <g key={i}>
            <polygon points={`${x0},${top0} ${x1},${top1} ${x1},${bot1} ${x0},${bot0}`} fill={`url(#${id('b-cab')})`} stroke="#0A0C08" strokeWidth="2" />
            {[0, 1, 2].map((k) => (
              <polygon key={k} points={`${x0 + 8},${top0 + 18 + k * 66} ${x1 - 8},${top1 + 18 + k * 64} ${x1 - 8},${top1 + 70 + k * 64} ${x0 + 8},${top0 + 72 + k * 66}`} fill="#54E6A5" opacity="0.55" filter={`url(#${id('bloom')})`} className="cell-glow" style={{ animationDelay: `${(i + k) * 0.4}s` }} />
            ))}
            <path d={`M${x0 + 20} ${top0} C ${x0 + 20} ${top0 - 30} ${x0 + 60} 30 ${x0 + 90} 10`} fill="none" stroke="#2A2418" strokeWidth="6" />
          </g>
        )
      })}
      {/* right wall pipes */}
      <polygon points="640,0 560,46 560,282 640,360" fill="#15110B" />
      {[572, 592, 612].map((x, i) => <rect key={x} x={x} y={40 + i * 6} width={12} height={300} fill="#241D12" stroke="#0E0A06" />)}
      {/* floor */}
      <polygon points="0,360 170,282 560,282 640,360" fill="#191510" />
      <g stroke="#0E0B07" strokeWidth="2">{[200, 260, 320, 380, 440, 500].map((x) => <line key={x} x1={x} y1={282} x2={x + (x - 365) * 0.6} y2={360} />)}</g>
      {/* hanging cables */}
      <path d="M120 40 C 180 120 260 60 330 90" fill="none" stroke="#0C0A07" strokeWidth="5" />
      <path d="M430 46 C 470 110 520 80 560 120" fill="none" stroke="#0C0A07" strokeWidth="4" />
      {/* green coolant tank */}
      <rect x={598} y={206} width={42} height={140} rx={10} fill="#0B2A1C" stroke="#3A3424" strokeWidth="3" />
      <rect x={602} y={226} width={34} height={114} rx={8} fill="#54E6A5" opacity="0.45" filter={`url(#${id('bloom')})`} />
      {full && [0, 1, 2].map((i) => <circle key={i} cx={610 + i * 9} cy={330} r={2} fill="#C8F7B0" className="bubble" style={{ animationDelay: `${i * 0.8}s` }} />)}
      {full && <HoloPanel x={230} y={120} w={66} h={34} title="DIAGNOSTICS" />}
    </g>
  )
}

export function BatteryDesk({ full }: SceneProps) {
  return (
    <g>
      <polygon points="248,250 624,242 640,272 228,284" fill="#4A3A28" />
      <polygon points="248,250 624,242 626,246 246,254" fill="#7A6040" />
      <polygon points="228,284 640,272 640,360 228,360" fill="#1C150E" />
      <g stroke="#0E0A06" strokeWidth="2"><line x1={240} x2={640} y1={312} y2={304} /><line x1={430} x2={430} y1={278} y2={360} /></g>
      {full && (
        <g>
          {/* pliers, screwdrivers and a cable coil on the bench */}
          <path d="M268 266 l26 -6 M268 270 l26 -2" stroke="#9AA5BD" strokeWidth="3" strokeLinecap="round" />
          <path d="M294 260 q14 -4 22 2 M294 268 q14 4 22 0" stroke="#C0392B" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x={540} y={256} width={40} height={4} rx={2} fill="#C9D2E6" transform="rotate(-6 540 256)" />
          <rect x={526} y={258} width={16} height={7} rx={3} fill="#E0A84A" transform="rotate(-6 526 258)" />
          <g fill="none" stroke="#2A1E14" strokeWidth="3"><ellipse cx={600} cy={262} rx={18} ry={6} /><ellipse cx={600} cy={259} rx={13} ry={4} /></g>
        </g>
      )}
    </g>
  )
}

export function BatteryPart({ id, p, mode, hits }: SceneProps) {
  const bloom = `url(#${id('bloom')})`
  const fillW = 132 * p
  const lead = 'M330 238 C 300 250 286 262 262 266'
  return (
    <g>
      <ellipse cx={398} cy={262} rx={86} ry={6} fill="#000" opacity="0.5" filter={`url(#${id('soft')})`} />
      <path d={lead} fill="none" stroke="#C26A2E" strokeWidth="4" />
      {mode === 'weld' && hits > 0 && <path key={`pulse-${hits}`} d={lead} pathLength={100} fill="none" stroke="#9CFF6B" strokeWidth="5" strokeLinecap="round" filter={bloom} className="lead-pulse" />}
      {/* glass power cell, lying on its side */}
      <rect x={330} y={206} width={136} height={52} rx={24} fill="#06140C" stroke="#7A8A80" strokeWidth="3" />
      <rect x={334} y={210} width={fillW} height={44} rx={20} fill="#6BFF8A" opacity="0.85" filter={bloom} className="cell-liquid" />
      <rect x={340} y={212} width={116} height={6} rx={3} fill="#FFFFFF" opacity="0.25" />
      {[360, 432].map((x) => <rect key={x} x={x} y={204} width={8} height={56} rx={2} fill={`url(#${id('metal')})`} />)}
      <ellipse cx={330} cy={232} rx={12} ry={27} fill={`url(#${id('metal')})`} stroke="#252C44" strokeWidth="2" />
      <ellipse cx={466} cy={232} rx={12} ry={27} fill={`url(#${id('metal')})`} stroke="#252C44" strokeWidth="2" />
      <rect x={474} y={226} width={10} height={12} rx={2} fill="#9AA5BD" />
      {/* the crack seals with a glowing seam */}
      <path d="M420 208 l-8 14 l7 6 l-9 16" fill="none" stroke="#0A0A0A" strokeWidth="3" opacity={1 - p} />
      <path d="M420 208 l-8 14 l7 6 l-9 16" fill="none" stroke="#C8FFB0" strokeWidth="2" filter={bloom} opacity={p} />
      {p < 1 && (
        <g opacity={1 - p}>
          <path d="M414 204 q-8 -12 0 -22 q8 -10 0 -22" fill="none" stroke="#C8F7B0" strokeWidth="3" strokeLinecap="round" className="steam" />
          <path d="M424 206 q-6 -10 0 -18 q6 -8 0 -18" fill="none" stroke="#C8F7B0" strokeWidth="2.5" strokeLinecap="round" className="steam s2" />
        </g>
      )}
      {working(mode) && <Arcs key={`arcs-${hits}`} cx={400} cy={226} seed={hits} color="#B6FF9C" r={58} />}
      {working(mode) && <circle cx={400} cy={226} r={10} fill="#F2FFE8" filter={bloom} className="torch" />}
    </g>
  )
}

/* ================================================================ 02 CIRCUIT */

export function CircuitBack({ id, full }: SceneProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('c-wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4E2F3" />
          <stop offset="100%" stopColor="#8EA4C4" />
        </linearGradient>
      </defs>
      <rect width={640} height={360} fill="#AFC1DA" />
      {/* ceiling in perspective: light panels and vents */}
      <polygon points="0,0 640,0 640,72 0,112" fill="#BCCDE3" />
      {[[40, 28, 140], [250, 18, 130], [450, 10, 150]].map(([x, y, w]) => (
        <polygon key={x} points={`${x},${y} ${x + w},${y - 6} ${x + w - 6},${y + 10} ${x + 4},${y + 16}`} fill="#FFFFFF" filter={`url(#${id('bloom')})`} className="strip" />
      ))}
      {[[200, 52], [420, 40]].map(([x, y]) => (
        <g key={x}>
          <polygon points={`${x},${y} ${x + 90},${y - 4} ${x + 86},${y + 16} ${x + 4},${y + 20}`} fill="#7F93B2" />
          {[0, 1, 2, 3].map((i) => <line key={i} x1={x + 6} x2={x + 86} y1={y + 4 + i * 4} y2={y + i * 4} stroke="#5D6F8E" strokeWidth="1.5" />)}
        </g>
      ))}
      {/* back wall with equipment and glass chambers */}
      <polygon points="0,112 640,72 640,262 0,290" fill={`url(#${id('c-wall')})`} />
      <rect x={20} y={150} width={92} height={150} rx={4} fill="#D9E3F0" stroke="#8EA4C4" strokeWidth="2" />
      <rect x={30} y={162} width={72} height={40} rx={2} fill="#1C3350" />
      <rect x={34} y={168} width={50} height={3} fill="#7FF0FF" /><rect x={34} y={176} width={36} height={3} fill="#7FF0FF" opacity="0.7" />
      <rect x={248} y={120} width={120} height={130} rx={6} fill="#E8F6FF" fillOpacity="0.45" stroke="#9FB3D4" strokeWidth="2" />
      <rect x={262} y={196} width={92} height={46} fill="#C9D4E6" />
      <rect x={256} y={128} width={6} height={114} fill="#FFFFFF" opacity="0.6" />
      <rect x={128} y={210} width={100} height={70} rx={4} fill="#DCE5F1" stroke="#8EA4C4" strokeWidth="2" />
      {/* ceiling rail robotic arms */}
      <rect x={0} y={84} width={640} height={6} fill="#8994AE" />
      {[[110, 0], [380, 1.4]].map(([x, d]) => (
        <g key={x} className="rail-arm" style={{ animationDelay: `${d}s` }}>
          <rect x={x - 12} y={78} width={24} height={16} rx={3} fill="#5D6A88" />
          <path d={`M${x} 94 L${x + 18} 132 L${x + 6} 168`} fill="none" stroke="#7D89A6" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={x + 18} cy={132} r={6} fill="#4C5875" />
          <rect x={x - 4} y={166} width={20} height={16} rx={3} fill="#4C5875" />
          <circle cx={x + 6} cy={184} r={3} fill="#7FF0FF" filter={`url(#${id('bloom')})`} />
        </g>
      ))}
      <polygon points="0,290 640,262 640,360 0,360" fill="#C3CFDF" />
      {full && <HoloPanel x={420} y={110} w={70} h={34} title="DIAGNOSTICS" />}
      {full && <HoloPanel x={160} y={150} w={52} h={30} title="ROUTING" />}
    </g>
  )
}

export function CircuitTable({ id }: SceneProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('c-table')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9EEF6" />
          <stop offset="100%" stopColor="#A2B0C7" />
        </linearGradient>
      </defs>
      <polygon points="190,246 616,232 640,324 150,346" fill={`url(#${id('c-table')})`} stroke="#7D89A6" strokeWidth="2" />
      <polygon points="150,346 640,324 640,360 150,360" fill="#7D89A6" />
    </g>
  )
}

export function CircuitPart({ id, p, mode }: SceneProps) {
  const bloom = `url(#${id('bloom')})`
  const finished = done(p, mode)
  const ring = (rx: number, ry: number) => `M${420 - rx} 286 A ${rx} ${ry} 0 1 0 ${420 + rx} 286 A ${rx} ${ry} 0 1 0 ${420 - rx} 286`
  const traces = [ring(126, 34), ring(92, 25), ring(58, 16), 'M300 286 H540', 'M420 254 V318', 'M332 266 L508 306', 'M332 306 L508 266']
  return (
    <g>
      <ellipse cx={420} cy={296} rx={160} ry={46} fill="#000" opacity="0.35" filter={`url(#${id('soft')})`} />
      <ellipse cx={420} cy={286} rx={150} ry={42} fill="#0D3440" stroke="#36D9F5" strokeOpacity="0.7" strokeWidth="2" />
      {traces.map((d) => <path key={d} d={d} fill="none" stroke="#1E5A68" strokeWidth="2.2" />)}
      {traces.map((d) => <path key={`l${d}`} d={d} pathLength={100} fill="none" stroke="#7FF0FF" strokeWidth="2.2" strokeDasharray={`${p * 100} 100`} filter={bloom} className="trace-lit" />)}
      {finished && traces.slice(0, 3).map((d) => <path key={`f${d}`} d={d} pathLength={100} fill="none" stroke="#FFFFFF" strokeWidth="1.6" className="trace-flow" />)}
      {[[352, 276], [470, 296], [400, 304], [446, 268]].map(([x, y]) => (
        <polygon key={x} points={`${x},${y} ${x + 22},${y - 2} ${x + 26},${y + 8} ${x + 4},${y + 10}`} fill="#121826" stroke="#5D6A88" />
      ))}
      <g opacity={(1 - p) * 0.85}>
        <ellipse cx={392} cy={290} rx={26} ry={7} fill="#060403" opacity="0.7" />
        <ellipse cx={486} cy={278} rx={16} ry={5} fill="#060403" opacity="0.6" />
      </g>
      <circle cx={540} cy={300} r={4} fill={finished ? '#54E6A5' : '#FF647C'} filter={bloom} />
    </g>
  )
}

/* ================================================================ 03 CODE */

export function CodeBack({ id, full }: SceneProps) {
  const rack = (x0: number, x1: number, t0: number, t1: number, b0: number, b1: number, k: number) => (
    <g key={`${x0}`}>
      <polygon points={`${x0},${t0} ${x1},${t1} ${x1},${b1} ${x0},${b0}`} fill="#0F1A17" stroke="#04080A" strokeWidth="2" />
      {Array.from({ length: full ? 14 : 7 }, (_, i) => {
        const t = (i + 1) / ((full ? 14 : 7) + 1)
        const y0 = t0 + (b0 - t0) * t
        const y1 = t1 + (b1 - t1) * t
        return (
          <g key={i}>
            <line x1={x0 + 4} x2={x1 - 4} y1={y0} y2={y1} stroke="#04080A" strokeWidth="1.5" />
            {(i * 3 + k) % 4 !== 0 && <circle cx={x0 + 10} cy={y0 - 3} r={1.6} fill={(i + k) % 3 ? '#FF4D5E' : '#54E6A5'} className="led" style={{ animationDelay: `${((i * 7 + k * 3) % 13) / 10}s` }} />}
          </g>
        )
      })}
    </g>
  )
  return (
    <g>
      <defs>
        <linearGradient id={id('m-fog')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#CFE8E0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#CFE8E0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={640} height={360} fill="#08110F" />
      {/* corridor of racks receding to a far green screen */}
      <rect x={292} y={110} width={80} height={90} fill="#0B1814" />
      <rect x={306} y={124} width={52} height={36} fill="#2AFF9A" opacity="0.35" filter={`url(#${id('bloom')})`} />
      {rack(0, 70, 0, 30, 360, 330, 0)}
      {rack(70, 140, 30, 60, 330, 300, 1)}
      {rack(140, 200, 60, 84, 300, 276, 2)}
      {rack(200, 250, 84, 100, 276, 258, 3)}
      {rack(250, 292, 100, 110, 258, 230, 4)}
      {rack(640, 590, 0, 30, 360, 330, 5)}
      {rack(590, 540, 30, 60, 330, 300, 6)}
      {rack(540, 490, 60, 84, 300, 276, 7)}
      {rack(490, 372, 84, 110, 276, 230, 8)}
      {/* green status screens on the racks */}
      <polygon points="92,140 128,150 128,196 92,190" fill="#2AFF9A" opacity="0.4" filter={`url(#${id('bloom')})`} />
      <polygon points="600,150 626,142 626,200 600,204" fill="#2AFF9A" opacity="0.35" filter={`url(#${id('bloom')})`} />
      {/* overhead cables */}
      <path d="M0 20 C 120 70 220 40 320 70 S 520 40 640 20" fill="none" stroke="#04080A" strokeWidth="9" />
      <path d="M0 40 C 140 90 240 70 320 90" fill="none" stroke="#0B1612" strokeWidth="6" />
      <rect x={0} y={250} width={640} height={110} fill={`url(#${id('m-fog')})`} className="fog" />
    </g>
  )
}

export function CodeDesk({ full }: SceneProps) {
  return (
    <g>
      <polygon points="230,276 640,266 640,292 220,300" fill="#3E4440" />
      <polygon points="220,300 640,292 640,360 220,360" fill="#1A1E1C" />
      {/* keyboard */}
      <polygon points="438,256 540,252 554,276 428,282" fill="#8C8676" stroke="#4A463C" />
      {[0, 1, 2].map((r) => <line key={r} x1={440 + r * 2} x2={542 + r * 4} y1={262 + r * 6} y2={258 + r * 6} stroke="#5A5648" strokeWidth="3" strokeDasharray="5 2" />)}
      {full && (
        <g>
          <path d="M560 290 q10 -8 22 -2 M560 294 q12 4 22 -2" stroke="#C0392B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <g fill="none" stroke="#0E1210" strokeWidth="3"><ellipse cx={604} cy={292} rx={18} ry={6} /><ellipse cx={604} cy={289} rx={12} ry={4} /></g>
        </g>
      )}
    </g>
  )
}

const HEX = ['ERR_FATAL_CORRUPT 0x4E', 'ERR_TOTAL_CORRUPT 0x0F', 'DECRYPTION_RETRY FAIL', 'NULL_PTR @ 0x3A9F', 'STACK_OVRFLW 0x7E', 'SEGFAULT 0xDEAD']

export function CodePart({ id, p, mode, slipping }: SceneProps) {
  const bloom = `url(#${id('bloom')})`
  const stable = done(p, mode)
  const fixed = Math.floor(p * 6)
  const widths = [96, 70, 104, 58, 88, 76]
  return (
    <g>
      {/* CRT */}
      <rect x={300} y={248} width={70} height={22} rx={3} fill="#2A302C" />
      <rect x={276} y={124} width={158} height={130} rx={14} fill="#3A403A" stroke="#1A1E1C" strokeWidth="3" />
      <rect x={288} y={136} width={134} height={100} rx={10} fill="#04140C" stroke="#141814" strokeWidth="3" />
      {stable ? (
        <g filter={bloom}>
          <text x={355} y={180} textAnchor="middle" fontSize="12" fill="#7FF0FF" className="crt-text">SYS_STABLE</text>
          <text x={355} y={198} textAnchor="middle" fontSize="10" fill="#7FF0FF" className="crt-text">0 ERRORS</text>
          <rect x={348} y={206} width={14} height={5} fill="#7FF0FF" className="cursor" />
        </g>
      ) : (
        <>
          <g filter={bloom}>
            {widths.slice(0, fixed).map((w, i) => <rect key={i} x={296 + (i % 2) * 8} y={146 + i * 13} width={w} height={4} rx={1} fill="#54E6A5" opacity={0.85} />)}
            <rect x={296} y={146 + fixed * 13} width={7} height={6} fill="#54E6A5" className="cursor" />
          </g>
          {HEX.slice(fixed + 1).map((t, i) => (
            <text key={t} x={296} y={152 + (fixed + 1 + i) * 13} fontSize="7" fill="#FF4D5E" className={`crt-text hex ${i % 2 ? 'h2' : ''}`}>{t}</text>
          ))}
        </>
      )}
      <rect x={288} y={136} width={134} height={100} rx={10} fill={`url(#${id('scanlines')})`} />
      {!stable && <rect x={288} y={136} width={134} height={100} rx={10} fill="#FF4D5E" opacity={slipping ? 0.35 : 0.04} className="crt-glitch" />}
      {/* red warning holograms while the system is still corrupted */}
      {!stable && (
        <g>
          <g className="holo-float">
            <rect x={234} y={112} width={58} height={16} fill="#FF4D5E" fillOpacity="0.18" stroke="#FF4D5E" />
            <text x={240} y={123} fontSize="8" fill="#FF7A88" className="crt-text">WARNING ⚠</text>
          </g>
          <g className="holo-float h2">
            <rect x={300} y={256} width={128} height={16} fill="#FF4D5E" fillOpacity="0.22" stroke="#FF4D5E" />
            <text x={306} y={267} fontSize="7.5" fill="#FF9AA5" className="crt-text">DEBUGGING IN PROGRESS</text>
          </g>
        </g>
      )}
      <HoloPanel x={398} y={98} w={60} h={30} title="DIAGNOSTICS" color={stable ? '#7FF0FF' : '#54E6A5'} />
    </g>
  )
}

/* ================================================================ 04 COMMS */

const TOWERS: [number, number, number, string][] = [
  [0, 46, 200, '#FF4FB8'], [52, 34, 150, '#36D9F5'], [92, 50, 250, '#A78BFA'], [150, 30, 180, '#FF4FB8'], [186, 44, 220, '#36D9F5'],
  [380, 40, 210, '#FFCA70'], [426, 56, 270, '#36D9F5'], [490, 36, 190, '#FF4FB8'], [532, 48, 240, '#A78BFA'], [586, 54, 300, '#36D9F5'],
]

export function CommsBack({ id, full }: SceneProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('storm')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E0D2A" />
          <stop offset="60%" stopColor="#2A2058" />
          <stop offset="100%" stopColor="#3C2C6E" />
        </linearGradient>
      </defs>
      <rect width={640} height={360} fill={`url(#${id('storm')})`} />
      <g fill="#171538" opacity="0.9" className="smog">
        <ellipse cx={120} cy={40} rx={160} ry={34} /><ellipse cx={420} cy={26} rx={200} ry={30} /><ellipse cx={600} cy={60} rx={120} ry={26} />
      </g>
      {/* neon city */}
      {TOWERS.map(([x, w, h, c], i) => (
        <g key={x}>
          <rect x={x} y={330 - h} width={w} height={h} fill={i % 2 ? '#141030' : '#1A1440'} />
          {full && Array.from({ length: Math.floor(h / 22) }, (_, r) => ((r + i) % 3 === 0 ? null : (
            <rect key={r} x={x + 6 + (r % 2) * (w / 2 - 4)} y={340 - h + r * 22} width={5} height={7} fill={c} opacity="0.65" />
          )))}
          {i % 3 === 0 && <rect x={x + 6} y={350 - h} width={w - 12} height={22} fill={c} opacity="0.75" filter={`url(#${id('bloom')})`} className="neon" />}
        </g>
      ))}
      {/* flying cars */}
      {[[60, 0], [260, 3], [480, 6]].map(([y, d], i) => (
        <g key={i} className="aerocar" style={{ animationDelay: `${-d}s` }}>
          <rect x={100} y={60 + y / 3} width={26} height={7} rx={3} fill="#2A2350" />
          <circle cx={124} cy={63 + y / 3} r={2} fill="#FFCA70" />
          <circle cx={102} cy={63 + y / 3} r={1.6} fill="#FF4D5E" />
        </g>
      ))}
      {/* left scaffolding */}
      <g stroke="#0E0B22" strokeWidth="6">
        <line x1={20} y1={360} x2={20} y2={120} /><line x1={80} y1={360} x2={80} y2={140} />
        <line x1={20} y1={180} x2={80} y2={200} /><line x1={20} y1={260} x2={80} y2={240} /><line x1={20} y1={140} x2={80} y2={140} />
      </g>
    </g>
  )
}

export function CommsRail({ id, full }: SceneProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('deck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2340" />
          <stop offset="100%" stopColor="#0C0A18" />
        </linearGradient>
      </defs>
      <polygon points="0,304 640,282 640,360 0,360" fill={`url(#${id('deck')})`} />
      <ellipse cx={160} cy={330} rx={80} ry={8} fill="#FF4FB8" opacity="0.25" className="puddle" />
      {/* catwalk railing Tek works at */}
      <polygon points="372,262 640,254 640,262 372,270" fill="#5A4A3A" />
      <line x1={372} y1={300} x2={640} y2={290} stroke="#5A4A3A" strokeWidth="5" />
      {[384, 444, 560, 620].map((x) => <rect key={x} x={x} y={262} width={7} height={70} fill="#4A3C30" />)}
      {full && (
        <g>
          <rect x={590} y={276} width={44} height={26} rx={3} fill="#3A3048" stroke="#14172A" />
          <rect x={600} y={270} width={24} height={6} rx={2} fill="#5A4A3A" />
        </g>
      )}
    </g>
  )
}

export function CommsPart({ id, p, mode }: SceneProps) {
  const bloom = `url(#${id('bloom')})`
  const tilt = -8 - 30 * p // swings from misaligned to locked on the satellite
  const a = ((tilt - 70) * Math.PI) / 180
  const feed = { x: 300 + Math.cos(a) * 56, y: 150 + Math.sin(a) * 56 }
  const locked = done(p, mode)
  const strength = locked ? 1 : p * 0.45
  return (
    <g>
      {/* signal beam into the sky */}
      <polygon points={`${feed.x - 4},${feed.y} ${feed.x + 4},${feed.y + 4} 660,${-60 + 40 * (1 - p)} 600,-80`} fill={`url(#${id('beacon')})`} opacity={strength} filter={bloom} className={locked ? 'beam-locked' : 'beam-weak'} />
      {locked && [0.3, 0.55, 0.8].map((t) => <ellipse key={t} cx={feed.x + (630 - feed.x) * t} cy={feed.y + (-70 - feed.y) * t} rx={16} ry={6} fill="none" stroke="#FFE3A3" strokeWidth="2" transform={`rotate(-28 ${feed.x + (630 - feed.x) * t} ${feed.y + (-70 - feed.y) * t})`} className="beam-ring" />)}
      {p > 0.5 && <g className="holo-float"><circle cx={470} cy={70} r={18} fill="none" stroke="#7FF0FF" strokeWidth="1.5" /><circle cx={470} cy={70} r={4} fill="#7FF0FF" /><line x1={446} x2={494} y1={70} y2={70} stroke="#7FF0FF" /><line x1={470} x2={470} y1={46} y2={94} stroke="#7FF0FF" /></g>}
      {/* lattice tower */}
      <g stroke="#2E2440" strokeWidth="5">
        <line x1={280} y1={300} x2={296} y2={168} /><line x1={330} y1={300} x2={306} y2={168} />
        <line x1={284} y1={270} x2={326} y2={240} /><line x1={286} y1={240} x2={322} y2={210} /><line x1={288} y1={210} x2={318} y2={182} />
      </g>
      {/* the dish */}
      <g transform={`rotate(${tilt} 300 150)`}>
        <ellipse cx={300} cy={150} rx={86} ry={38} fill="#6B5A48" stroke="#2E2440" strokeWidth="4" />
        <ellipse cx={300} cy={150} rx={70} ry={28} fill="#8A7660" />
        <path d="M240 150 A 60 22 0 0 0 360 150" fill="none" stroke="#A8927A" strokeWidth="2" opacity="0.6" />
      </g>
      <line x1={300} y1={150} x2={feed.x} y2={feed.y} stroke="#2E2440" strokeWidth="4" />
      <circle cx={feed.x} cy={feed.y} r={6} fill={p > 0.1 ? '#FFE3A3' : '#5A4A3A'} filter={p > 0.1 ? bloom : undefined} />
      {/* fibre-optic bundle from the dish down to the junction Tek is welding */}
      <path d="M318 240 C 360 270 420 270 496 256" fill="none" stroke={p > 0.5 ? '#FFCA70' : '#3A3048'} strokeWidth="4" strokeDasharray={p > 0.5 ? '7 5' : undefined} filter={p > 0.5 ? bloom : undefined} className={p > 0.5 ? 'fibre-flow' : ''} />
      <rect x={492} y={250} width={18} height={14} rx={3} fill="#3A3048" stroke="#14172A" />
      <g opacity={1 - p} fill="none" strokeWidth="1.6" strokeLinecap="round">
        <path d="M510 256 q10 -6 6 -14" stroke="#FF647C" /><path d="M510 260 q12 0 14 -8" stroke="#7FF0FF" /><path d="M508 252 q2 -10 -4 -14" stroke="#FFCA70" />
      </g>
      <HoloPanel x={392} y={150} w={64} h={30} title="DIAGNOSTICS" />
    </g>
  )
}

export function CommsRain({ full }: SceneProps) {
  return (
    <g className="rain" pointerEvents="none">
      {Array.from({ length: full ? 90 : 40 }, (_, i) => {
        const x = (i * 71) % 660 - 10
        const y = (i * 113) % 360
        return <line key={i} x1={x} y1={y} x2={x - 5} y2={y + 16} stroke="#C4D2FF" strokeOpacity="0.4" strokeWidth="1.2" className="drop" style={{ animationDelay: `${(i % 10) * -0.06}s` }} />
      })}
    </g>
  )
}

/* ================================================================ 05 SHUTDOWN */

export function ReactorBack({ id, p, mode, full }: SceneProps) {
  const safe = done(p, mode)
  return (
    <g>
      <defs>
        <radialGradient id={id('fusion')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D6" />
          <stop offset="35%" stopColor={safe ? '#9FE8FF' : '#FFB03A'} />
          <stop offset="75%" stopColor={safe ? '#3A7BFF' : '#FF4A1C'} />
          <stop offset="100%" stopColor={safe ? '#1A3A9A' : '#8A1A0A'} />
        </radialGradient>
        <linearGradient id={id('r-cone')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF3B3B" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FF3B3B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={640} height={360} fill="#170708" />
      <g stroke="#2A1214" strokeWidth="3" fill="none">{[0, 110, 220].map((x) => <rect key={x} x={x + 6} y={20} width={98} height={250} rx={4} />)}</g>
      {/* blast door ring with the fusion core */}
      <circle cx={470} cy={140} r={126} fill="#120406" />
      <circle cx={470} cy={140} r={100} fill={`url(#${id('fusion')})`} className="plasma" opacity={1 - p * 0.3} />
      {!safe && (
        <g className="plasma-swirl" style={{ transformOrigin: '470px 140px' }} fill="none" stroke="#FFE3A3" strokeWidth="2" opacity="0.7">
          <path d="M400 130 l20 10 l-8 14 l24 6" /><path d="M500 80 l-10 22 l16 4 l-6 20" /><path d="M520 180 l-18 -6 l-4 18" />
        </g>
      )}
      <circle cx={470} cy={140} r={112} fill="none" stroke="#3A2A2E" strokeWidth="22" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return <circle key={i} cx={470 + Math.cos(a) * 112} cy={140 + Math.sin(a) * 112} r={3} fill="#5A4448" />
      })}
      {/* steam jets around the core */}
      {!safe && full && [[-0.7, 'j1'], [0.5, 'j2'], [2.4, 'j3'], [3.6, 'j4']].map(([a, k]) => {
        const ang = Number(a)
        const x = 470 + Math.cos(ang) * 120
        const y = 140 + Math.sin(ang) * 120
        return (
          <g key={String(k)} className="steam-jet" style={{ transformOrigin: `${x}px ${y}px` }}>
            <circle cx={x + Math.cos(ang) * 10} cy={y + Math.sin(ang) * 10} r={8} />
            <circle cx={x + Math.cos(ang) * 22} cy={y + Math.sin(ang) * 22} r={11} />
            <circle cx={x + Math.cos(ang) * 36} cy={y + Math.sin(ang) * 36} r={14} />
          </g>
        )
      })}
      {/* left: danger cabinet with siren */}
      <rect x={130} y={110} width={96} height={170} rx={4} fill="#3A3438" stroke="#1A1416" strokeWidth="2" />
      <rect x={142} y={126} width={72} height={40} rx={2} fill="#E8E2D8" />
      <rect x={142} y={126} width={72} height={12} fill="#C0392B" />
      <text x={178} y={135} textAnchor="middle" fontSize="8" fill="#FFFFFF" className="crt-text">DANGER</text>
      <text x={178} y={150} textAnchor="middle" fontSize="7" fill="#1A1416" className="crt-text">CRITICAL</text>
      <text x={178} y={160} textAnchor="middle" fontSize="7" fill="#1A1416" className="crt-text">FUSION</text>
      <rect x={160} y={90} width={34} height={20} rx={4} fill="#3A2A2E" />
      <circle cx={177} cy={88} r={10} fill={safe ? '#54E6A5' : '#FF3B3B'} filter={`url(#${id('bloom')})`} className={safe ? '' : 'alarm'} />
      {!safe && <polygon points="177,88 100,280 250,280" fill={`url(#${id('r-cone')})`} className="strobe" style={{ transformOrigin: '177px 88px' }} />}
      <rect x={250} y={70} width={78} height={30} rx={2} fill="#E0A84A" />
      <text x={289} y={89} textAnchor="middle" fontSize="9" fill="#1A1416" className="crt-text">CRITICAL FUSION</text>
      <polygon points="40,150 58,120 76,150" fill="#E0A84A" stroke="#1A1416" strokeWidth="2" />
      <text x={58} y={146} textAnchor="middle" fontSize="12" fill="#1A1416" className="crt-text">!</text>
      {/* right: red glowing tank and shutdown sign */}
      <rect x={596} y={210} width={44} height={140} rx={10} fill="#2A0A0A" stroke="#3A2A2E" strokeWidth="3" />
      <rect x={600} y={230} width={36} height={112} rx={8} fill={safe ? '#3A7BFF' : '#FF4A1C'} opacity="0.5" filter={`url(#${id('bloom')})`} />
      <rect x={586} y={60} width={54} height={26} rx={2} fill="#2A1214" stroke="#5A2A2E" />
      <text x={613} y={77} textAnchor="middle" fontSize="7.5" fill={safe ? '#54E6A5' : '#FF7A5C'} className={`crt-text ${safe ? '' : 'countdown'}`}>{safe ? 'CORE SAFE' : p > 0.5 ? 'SHUTDOWN' : 'T-00:42'}</text>
      <rect x={0} y={282} width={640} height={10} fill={`url(#${id('hazard')})`} opacity="0.7" />
      <polygon points="0,292 640,292 640,360 0,360" fill="#1A0E10" />
    </g>
  )
}

export function ReactorConsole({ id, p }: SceneProps) {
  const lever = -30 + 60 * p // levers pulled as the shutdown proceeds
  return (
    <g>
      <polygon points="232,276 616,268 640,300 214,310" fill="#4A4448" />
      <polygon points="214,310 640,300 640,360 214,360" fill="#2A2428" />
      <rect x={214} y={314} width={426} height={8} fill={`url(#${id('hazard')})`} />
      {[[300, 286], [574, 282]].map(([x, y]) => (
        <g key={x}>
          <rect x={x - 12} y={y - 4} width={24} height={10} rx={3} fill="#1A1416" />
          <g transform={`rotate(${lever} ${x} ${y})`}>
            <rect x={x - 2.5} y={y - 40} width={5} height={40} fill="#9AA5BD" />
            <circle cx={x} cy={y - 42} r={6} fill="#1A1416" />
          </g>
        </g>
      ))}
      {p > 0.7 && <polygon points="232,276 616,268 640,300 214,310" fill="#BFEFFF" opacity={(p - 0.7) * 0.8} />}
    </g>
  )
}

export function ReactorPart({ id, p, mode, hits }: SceneProps) {
  const bloom = `url(#${id('bloom')})`
  const spin = p * 720
  const needle = 60 - 120 * p
  return (
    <g>
      {/* pressure gauge on the console */}
      <g transform="translate(350 290)">
        <circle r={14} fill="#E7E1D2" stroke="#1A1416" strokeWidth="3" />
        <path d="M-10 6 A 11 11 0 0 1 -5 -9" fill="none" stroke="#54E6A5" strokeWidth="3" />
        <path d="M5 -9 A 11 11 0 0 1 10 6" fill="none" stroke="#FF4D5E" strokeWidth="3" />
        <line x1={0} y1={0} x2={0} y2={-10} stroke="#1A1416" strokeWidth="2" strokeLinecap="round" transform={`rotate(${needle})`} />
      </g>
      {/* valve pedestal and wheel (seen at an angle) */}
      <rect x={428} y={262} width={44} height={36} rx={4} fill="#3A3438" stroke="#1A1416" strokeWidth="2" />
      <ellipse cx={450} cy={262} rx={22} ry={7} fill="#4A4448" />
      <g transform="translate(450 258) scale(1 0.32)">
        <circle r={60} fill="none" stroke="#1A1416" strokeWidth="14" />
        <circle r={60} fill="none" stroke="#5A5458" strokeWidth="9" />
        <g transform={`rotate(${spin})`} className="wheel-spokes">
          {[0, 60, 120, 180, 240, 300].map((a) => <line key={a} x1={0} y1={0} x2={Math.cos((a * Math.PI) / 180) * 58} y2={Math.sin((a * Math.PI) / 180) * 58} stroke="#5A5458" strokeWidth="8" />)}
        </g>
        <circle r={12} fill="#3A3438" />
      </g>
      {working(mode) && <circle cx={450} cy={278} r={8} fill="#FFE3A3" filter={bloom} className="torch" />}
      {mode === 'weld' && hits > 0 && (
        <g key={`cryo-${hits}`} className="cryo" transform="translate(450 290)">
          <circle cx={-14} cy={0} r={8} /><circle cx={0} cy={-6} r={10} /><circle cx={14} cy={0} r={7} />
        </g>
      )}
      <HoloPanel x={318} y={196} w={60} h={30} title="DIAGNOSTICS" color={done(p, mode) ? '#54E6A5' : '#FF7A5C'} />
    </g>
  )
}

export function Embers({ p, mode, full }: SceneProps) {
  if (done(p, mode)) return null
  return (
    <g className="particles rising" opacity={1 - p * 0.8} pointerEvents="none">
      {Array.from({ length: full ? 10 : 5 }, (_, i) => <circle key={i} cx={240 + ((i * 53) % 380)} cy={300 + (i % 3) * 18} r={i % 3 === 0 ? 2 : 1.4} fill="#FF9A3D" style={{ animationDelay: `${i * 0.5}s` }} />)}
    </g>
  )
}
