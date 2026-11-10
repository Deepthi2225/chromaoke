// Original robot character. One base design, tinted per mission, with the five
// expressions from vision Section 6.3: idle, damaged, struggling, repaired, celebrating.

import { useId } from 'react'

export type RobotMood = 'idle' | 'damaged' | 'struggling' | 'repaired' | 'celebrating'

interface RobotProps {
  mood: RobotMood
  hue: number
  /** 0-100. Drives the chest gauge, cracks and sparks. */
  health?: number
  size?: number
  /** Increment to replay the "ouch" flinch on a typing error. */
  hit?: number
  label?: string
}

export function Robot({ mood, hue, health = 100, size = 220, hit = 0, label }: RobotProps) {
  const shell = `hsl(${hue} 55% 72%)`
  const shellDark = `hsl(${hue} 35% 42%)`
  const shellLight = `hsl(${hue} 70% 86%)`
  const eye = mood === 'repaired' || mood === 'celebrating' ? '#54E6A5' : mood === 'damaged' ? '#FF647C' : '#36D9F5'
  const bulb = health < 35 ? '#FF647C' : health < 70 ? '#FFCA70' : '#54E6A5'
  const gauge = Math.max(0, Math.min(100, health))
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  return (
    <svg
      className={`robot mood-${mood}`}
      key={hit ? `hit-${hit}` : undefined}
      width={size}
      height={size * 1.1}
      viewBox="0 0 200 220"
      role="img"
      aria-label={label ?? `Robot, ${mood}`}
    >
      <defs>
        <radialGradient id={`glow-${hue}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={eye} stopOpacity="0.55" />
          <stop offset="100%" stopColor={eye} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`shell-${hue}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shellLight} />
          <stop offset="100%" stopColor={shell} />
        </linearGradient>
        <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="45%" stopColor="#0B1020" stopOpacity="0" />
          <stop offset="100%" stopColor="#0B1020" stopOpacity="0.35" />
        </linearGradient>
        <filter id={`${uid}-bloom`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse className="robot-shadow" cx="100" cy="210" rx="52" ry="7" fill="#000" opacity="0.35" />

      <g className="robot-body">
        {/* antenna */}
        <line x1="100" y1="32" x2="100" y2="14" stroke={shellDark} strokeWidth="4" strokeLinecap="round" />
        <circle className="robot-bulb" cx="100" cy="11" r="7" fill={bulb} filter={`url(#${uid}-bloom)`} />
        <circle cx="100" cy="11" r="14" fill={bulb} opacity="0.18" />

        {/* ears */}
        <rect x="28" y="62" width="16" height="30" rx="6" fill={shellDark} />
        <rect x="156" y="62" width="16" height="30" rx="6" fill={shellDark} />

        {/* head */}
        <rect x="38" y="30" width="124" height="92" rx="28" fill={`url(#shell-${hue})`} stroke={shellDark} strokeWidth="3" />
        <rect x="38" y="30" width="124" height="92" rx="28" fill={`url(#${uid}-shade)`} />
        <ellipse cx="66" cy="40" rx="20" ry="6" fill="#FFFFFF" opacity="0.5" transform="rotate(-12 66 40)" />
        <rect x="52" y="45" width="96" height="62" rx="18" fill="#0B1020" stroke={shellDark} strokeWidth="2" />
        <ellipse cx="100" cy="76" rx="44" ry="26" fill={`url(#glow-${hue})`} />
        <g filter={`url(#${uid}-bloom)`}>
          <Face mood={mood} eye={eye} />
        </g>
        <path d="M60 52 L84 52 L66 100 L58 100 Z" fill="#FFFFFF" opacity="0.06" />

        {/* cracks appear as the robot gets more damaged */}
        {gauge < 60 && <path d="M140 34 l-8 12 l6 4 l-7 11" fill="none" stroke={shellDark} strokeWidth="2.5" strokeLinecap="round" />}
        {gauge < 35 && <path d="M46 98 l10 -6 l-2 8 l9 -3" fill="none" stroke={shellDark} strokeWidth="2.5" strokeLinecap="round" />}

        {/* neck + body */}
        <rect x="88" y="120" width="24" height="10" fill={shellDark} />
        <g className="robot-arm left">
          <rect x="30" y="136" width="22" height="50" rx="11" fill={shell} stroke={shellDark} strokeWidth="3" />
        </g>
        <g className="robot-arm right">
          <rect x="148" y="136" width="22" height="50" rx="11" fill={shell} stroke={shellDark} strokeWidth="3" />
        </g>
        <rect x="54" y="128" width="92" height="70" rx="20" fill={`url(#shell-${hue})`} stroke={shellDark} strokeWidth="3" />
        <rect x="54" y="128" width="92" height="70" rx="20" fill={`url(#${uid}-shade)`} />
        <ellipse cx="74" cy="137" rx="12" ry="4" fill="#FFFFFF" opacity="0.4" />

        {/* chest gauge: the robot's physical condition */}
        <rect x="70" y="146" width="60" height="12" rx="6" fill="#0B1020" />
        <rect x="72" y="148" width={56 * (gauge / 100)} height="8" rx="4" fill={bulb} style={{ transition: 'width .35s ease, fill .35s' }} />
        <circle cx="80" cy="176" r="5" fill="#0B1020" />
        <circle cx="100" cy="176" r="5" fill={gauge > 50 ? '#36D9F5' : '#0B1020'} />
        <circle cx="120" cy="176" r="5" fill={gauge > 85 ? '#A78BFA' : '#0B1020'} />

        {(mood === 'damaged' || mood === 'struggling') && (
          <g className="robot-sparks" fill="#FFCA70">
            <path d="M160 40 l4 8 l8 2 l-8 3 l-4 8 l-3 -8 l-8 -3 l8 -2z" />
            <path d="M34 120 l3 6 l6 1 l-6 2 l-3 6 l-2 -6 l-6 -2 l6 -1z" />
          </g>
        )}
        {mood === 'struggling' && <path className="robot-sweat" d="M156 52 q6 10 0 14 q-6 -4 0 -14z" fill="#36D9F5" />}
        {mood === 'celebrating' && (
          <g className="robot-confetti">
            <rect x="20" y="20" width="7" height="7" fill="#A78BFA" transform="rotate(20 23 23)" />
            <rect x="172" y="28" width="7" height="7" fill="#FFCA70" transform="rotate(-15 175 31)" />
            <circle cx="182" cy="96" r="4" fill="#54E6A5" />
            <circle cx="16" cy="88" r="4" fill="#36D9F5" />
          </g>
        )}
      </g>
    </svg>
  )
}

function Face({ mood, eye }: { mood: RobotMood; eye: string }) {
  const stroke = { stroke: eye, strokeWidth: 5, strokeLinecap: 'round' as const, fill: 'none' }
  switch (mood) {
    case 'damaged':
      return (
        <g>
          <path d="M70 64 l14 14 M84 64 l-14 14" {...stroke} />
          <rect className="eye-flicker" x="114" y="64" width="14" height="14" rx="5" fill={eye} opacity="0.5" />
          <path d="M80 96 l7 -4 l7 4 l7 -4 l7 4 l7 -4" {...stroke} strokeWidth={3} />
        </g>
      )
    case 'struggling':
      return (
        <g>
          <path d="M68 70 l18 4" {...stroke} />
          <path d="M132 70 l-18 4" {...stroke} />
          <rect x="72" y="76" width="12" height="9" rx="4" fill={eye} />
          <rect x="116" y="76" width="12" height="9" rx="4" fill={eye} />
          <path d="M86 98 q14 -8 28 0" {...stroke} strokeWidth={3} />
        </g>
      )
    case 'repaired':
      return (
        <g>
          <path d="M68 76 q9 -12 18 0" {...stroke} />
          <path d="M114 76 q9 -12 18 0" {...stroke} />
          <path d="M84 92 q16 12 32 0" {...stroke} strokeWidth={4} />
        </g>
      )
    case 'celebrating':
      return (
        <g>
          <path d="M77 60 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill={eye} />
          <path d="M123 60 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill={eye} />
          <path d="M82 89 q18 20 36 0z" fill={eye} />
        </g>
      )
    default:
      return (
        <g className="eyes-blink">
          <rect x="70" y="62" width="16" height="20" rx="7" fill={eye} />
          <rect x="114" y="62" width="16" height="20" rx="7" fill={eye} />
          <path d="M90 96 q10 5 20 0" {...stroke} strokeWidth={3} />
        </g>
      )
  }
}
