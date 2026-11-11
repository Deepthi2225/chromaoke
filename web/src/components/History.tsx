import { useState } from 'react'
import { MODE_LABEL, type ResultRecord } from '../engine/storage'
import { streakDays } from '../engine/streak'
import { ENOUGH_TYPING, lettersTyped, type KeyStats } from '../engine/keys'
import { KeyboardHeatmap } from './KeyboardHeatmap'
import { TrendChart } from './TrendChart'

interface Props {
  history: ResultRecord[]
  keyStats: KeyStats
  signedIn: boolean
  onPick: (songId: number) => void
  onClear: () => void
}

const CHART_POINTS = 30
const dateLabel = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export function History({ history, keyStats, signedIn, onPick, onClear }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (!history.length) {
    return (
      <section className="history">
        <h1>Progress</h1>
        <p className="muted">Songs you finish will show up here, with your speed over time and the keys you miss.</p>
      </section>
    )
  }

  const recent = history.slice(-CHART_POINTS)
  const best = Math.max(...history.map((r) => r.wpm))
  const average = Math.round(history.reduce((total, r) => total + r.accuracy, 0) / history.length)
  const songs = new Set(history.map((r) => r.songId)).size
  const streak = streakDays(history)

  return (
    <section className="history">
      <h1>Progress</h1>
      <p className="muted">{signedIn ? 'Saved to your account.' : 'Saved in this browser. Sign in to keep it across devices.'}</p>

      <div className="headline four">
        <div><strong>{songs}</strong><span>{songs === 1 ? 'song' : 'songs'} typed</span></div>
        <div><strong>{best}</strong><span>best WPM</span></div>
        <div><strong>{average}%</strong><span>average accuracy</span></div>
        <div><strong>{streak}</strong><span>day streak{streak === 0 ? ', type a song to start one' : ''}</span></div>
      </div>

      <TrendChart title="WPM per song" values={recent.map((r) => r.wpm)} labels={recent.map((r) => dateLabel(r.at))} unit="WPM" color="var(--accent)" />

      {lettersTyped(keyStats) >= ENOUGH_TYPING && (
        <>
          <h2 className="spaced">Your keyboard</h2>
          <p className="muted">Redder keys are missed more often. Hover a key for its numbers. The Practice tab has songs and drills for them.</p>
          <KeyboardHeatmap stats={keyStats} />
        </>
      )}

      <h2 className="spaced">Every attempt</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Song</th><th>Mode</th><th className="num">WPM</th><th className="num">Accuracy</th><th className="num">Covered</th><th>Date</th></tr>
          </thead>
          <tbody>
            {[...history].reverse().map((record) => (
              <tr key={`${record.at}-${record.songId}`}>
                <td><button className="link" onClick={() => onPick(record.songId)}>{record.title}</button><span className="muted"> {record.artist}</span></td>
                <td>{MODE_LABEL[record.mode]}</td>
                <td className="num">{record.wpm}</td>
                <td className="num">{record.accuracy}%</td>
                <td className="num">{record.completion}%</td>
                <td>{dateLabel(record.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions">
        {confirming ? (
          <>
            <span>Delete all history and key statistics?</span>
            <button className="danger" onClick={() => { onClear(); setConfirming(false) }}>Delete</button>
            <button className="ghost" onClick={() => setConfirming(false)}>Cancel</button>
          </>
        ) : (
          <button className="link" onClick={() => setConfirming(true)}>Clear history</button>
        )}
      </div>
    </section>
  )
}
