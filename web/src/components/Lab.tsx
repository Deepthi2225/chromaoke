import { useState, type CSSProperties } from 'react'
import { getMission } from '../data/missions'
import { CATEGORY_LABELS, weakBigrams, type WeaknessCategory } from '../engine/analyzer'
import type { SaveData } from '../engine/storage'
import { TrendChart } from './TrendChart'

const KEY_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./']

/** Performance Laboratory (vision Section 7, page 4). */
export function Lab({ save, signedIn, onClear }: { save: SaveData; signedIn: boolean; onClear: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const history = save.history.slice(-30)
  const labels = history.map((r) => new Date(r.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
  const total = save.history.length
  const repaired = save.history.filter((r) => r.repaired)
  const best = Math.max(0, ...save.history.map((r) => r.wpm))
  const avg = total ? Math.round(save.history.reduce((s, r) => s + r.wpm, 0) / total) : 0

  // Combine upper and lower case so the keyboard heatmap stays readable.
  const keyRates: Record<string, [number, number]> = {}
  for (const [char, [n, e]] of Object.entries(save.profile.chars)) {
    const k = char.toLowerCase()
    const prev = keyRates[k] ?? [0, 0]
    keyRates[k] = [prev[0] + n, prev[1] + e]
  }
  const pairs = weakBigrams(save.profile, 6)

  return (
    <section className="lab screen-enter">
      <div className="section-title"><h1>Performance Laboratory</h1><span className="muted">Built from {total} repair{total === 1 ? '' : 's'}. {signedIn ? 'Saved to your account' : 'Saved on this device'}. Only summaries are stored, never raw keystrokes.</span></div>

      <div className="stat-tiles lab-tiles holo-panel">
        <div><span>REPAIRS</span><strong>{repaired.length}</strong><small>{total - repaired.length} failed</small></div>
        <div><span>AVERAGE WPM</span><strong>{avg}</strong><small>all sessions</small></div>
        <div><span>BEST WPM</span><strong>{best}</strong><small>personal record</small></div>
        <div><span>XP</span><strong>{save.xp.toLocaleString()}</strong><small>lifetime</small></div>
      </div>

      <div className="lab-grid">
        <div className="holo-panel"><TrendChart title="WPM progression (last 30 repairs)" values={history.map((r) => r.wpm)} labels={labels} unit="WPM" color="var(--accent)" /></div>
        <div className="holo-panel"><TrendChart title="Accuracy trend (last 30 repairs)" values={history.map((r) => r.accuracy)} labels={labels} unit="%" color="var(--accent-2)" max={100} /></div>

        <div className="holo-panel">
          <p className="eyebrow">TYPING BEHAVIOUR PROFILE</p>
          {save.profile.sessions === 0 && <p className="muted">Complete a repair to build your profile.</p>}
          <div className="weakness-list">
            {(Object.keys(CATEGORY_LABELS) as WeaknessCategory[]).map((key) => {
              const value = save.profile.severity[key]
              const label = value >= 0.5 ? 'Needs work' : value >= 0.2 ? 'Watch' : 'Solid'
              return (
                <div key={key} className="weakness">
                  <span>{CATEGORY_LABELS[key]}</span>
                  <div className="meter"><i style={{ width: `${Math.max(3, value * 100)}%` }} /></div>
                  <em className={`sev sev-${label === 'Solid' ? 0 : label === 'Watch' ? 1 : 2}`}>{label}</em>
                </div>
              )
            })}
          </div>
        </div>

        <div className="holo-panel">
          <p className="eyebrow">ERROR HEATMAP · ERROR RATE PER KEY</p>
          <div className="keyboard" role="table" aria-label="Error rate per key">
            {KEY_ROWS.map((row, r) => (
              <div className="key-row" role="row" key={row} style={{ paddingLeft: `${r * 14}px` }}>
                {[...row].map((k) => {
                  const [n, e] = keyRates[k] ?? [0, 0]
                  const rate = n ? e / n : 0
                  return (
                    <div key={k} role="cell" className={`key ${n ? '' : 'unused'}`} style={{ '--heat': Math.min(1, rate * 4) } as CSSProperties} title={n ? `${k}: ${Math.round(rate * 100)}% errors over ${n} presses` : `${k}: not typed yet`}>
                      {k}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="heat-legend"><span>0%</span><i /><span>25%+ errors</span></div>
          {pairs.length > 0 && (
            <>
              <p className="eyebrow">SLOW OR ERROR-PRONE LETTER PAIRS</p>
              <div className="pairs">{pairs.map((p) => <span key={p.pair}><strong>{p.pair}</strong> {p.ms} ms · {Math.round(p.rate * 100)}% err</span>)}</div>
            </>
          )}
        </div>
      </div>

      <div className="holo-panel history">
        <p className="eyebrow">RECENT REPAIRS</p>
        <table>
          <thead><tr><th>When</th><th>Mission</th><th>Level</th><th>WPM</th><th>Accuracy</th><th>Result</th></tr></thead>
          <tbody>
            {save.history.slice(-8).reverse().map((r) => (
              <tr key={r.at}>
                <td>{new Date(r.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>{getMission(r.mission).name}</td>
                <td>{r.level}</td>
                <td>{r.wpm}</td>
                <td>{r.accuracy}%</td>
                <td className={r.repaired ? 'mint' : 'coral'}>{r.repaired ? '✓ Repaired' : '✕ Failed'}</td>
              </tr>
            ))}
            {!total && <tr><td colSpan={6} className="muted">No repairs yet.</td></tr>}
          </tbody>
        </table>
        <div className="danger-zone">
          {confirming ? (
            <>
              <span>Delete all history, XP and your typing profile{signedIn ? ' from your account' : ''}?</span>
              <button className="danger-btn" onClick={() => { onClear(); setConfirming(false) }}>Yes, delete</button>
              <button className="ghost-btn" onClick={() => setConfirming(false)}>Cancel</button>
            </>
          ) : (
            <button className="ghost-btn" onClick={() => setConfirming(true)}>Clear my typing history</button>
          )}
        </div>
      </div>
    </section>
  )
}
