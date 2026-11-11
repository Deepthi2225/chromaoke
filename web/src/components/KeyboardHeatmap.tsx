import { missRate, type KeyStats } from '../engine/keys'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
/** A key missed this often or more is shown at full strength. */
const FULL_HEAT = 0.12

/** The keyboard, with each letter tinted by how often it is missed. Letters with too little typing stay plain. */
export function KeyboardHeatmap({ stats }: { stats: KeyStats }) {
  return (
    <div className="keyboard" role="img" aria-label="Keyboard showing how often each letter is missed">
      {ROWS.map((row) => (
        <div key={row} className="keyboard-row">
          {[...row].map((letter) => {
            const key = missRate(stats, letter)
            const heat = key ? Math.min(1, key.rate / FULL_HEAT) : 0
            return (
              <span
                key={letter}
                className={key ? 'key' : 'key unknown'}
                style={{ background: `color-mix(in srgb, var(--bad) ${Math.round(heat * 85)}%, var(--bg-raised))` }}
                title={key ? `${letter.toUpperCase()}: missed ${(key.rate * 100).toFixed(1)}% (${key.errors} of ${key.attempts})` : `${letter.toUpperCase()}: not enough typing yet`}
              >
                {letter}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
