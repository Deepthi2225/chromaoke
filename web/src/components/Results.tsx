import { useEffect } from 'react'
import type { Mode, Song } from '../engine/api'
import type { SessionResult } from '../engine/session'
import { MODE_LABEL } from '../engine/storage'
import { formatTime } from '../engine/format'
import { costliestKeys } from '../engine/keys'
import { TrendChart } from './TrendChart'

export interface ResultsData {
  song: Song
  mode: Mode
  result: SessionResult
  previousBest: number | null
}

interface Props {
  data: ResultsData
  onAgain: () => void
  onNewSong: () => void
  /** Null for drills, which have no leaderboard. */
  onLeaderboard: (() => void) | null
  /** Set for guests: opens the sign-in page. */
  onSignIn: (() => void) | null
}

const WINDOW_SECONDS = 5
const MAX_MISSED_SHOWN = 40

export function Results({ data, onAgain, onNewSong, onLeaderboard, onSignIn }: Props) {
  const { song, mode, result, previousBest } = data
  const { metrics } = result

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.key === 'Enter') onAgain()
      if (event.key === 'Escape') onNewSong()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAgain, onNewSong])

  const isBest = previousBest !== null && metrics.wpm > previousBest
  const labels = metrics.wpmTimeline.map((_, i) => formatTime(i * WINDOW_SECONDS))
  const costly = costliestKeys(metrics)

  return (
    <section className="results-page">
      <p className="eyebrow">{MODE_LABEL[mode]}</p>
      <h1>{song.title}</h1>
      <p className="lede">{song.artist}</p>

      <div className="headline">
        <div>
          <strong>{metrics.wpm}</strong>
          <span>WPM{isBest ? ', a new best for this song' : previousBest !== null ? `, best ${previousBest}` : ''}</span>
        </div>
        <div>
          <strong>{metrics.accuracy}%</strong>
          <span>accuracy</span>
        </div>
        <div>
          <strong>{result.wordsCorrect}<small>/{result.wordsTotal}</small></strong>
          <span>words right</span>
        </div>
      </div>

      <dl className="detail">
        <div><dt>Raw speed</dt><dd>{metrics.rawWpm} WPM</dd></div>
        <div><dt>Best 5 seconds</dt><dd>{metrics.burstWpm} WPM</dd></div>
        <div><dt>Consistency</dt><dd>{metrics.consistency}/100</dd></div>
        <div><dt>Time typing</dt><dd>{formatTime(metrics.elapsedSeconds)}</dd></div>
        <div><dt>Song covered</dt><dd>{result.completion}%</dd></div>
        <div><dt>Corrections</dt><dd>{metrics.backspaces}</dd></div>
      </dl>

      <TrendChart title="Speed through the song" values={metrics.wpmTimeline} labels={labels} unit="WPM" color="var(--accent)" />

      {costly.length > 0 && (
        <div className="missed">
          <h2>Keys that cost you most</h2>
          <p>{costly.map(({ key, errors }) => <span key={key}><b>{key.toUpperCase()}</b> missed {errors} times</span>)}</p>
        </div>
      )}

      {result.missed.length > 0 && (
        <div className="missed">
          <h2>Words to revisit</h2>
          <p>{result.missed.slice(0, MAX_MISSED_SHOWN).map((word) => <span key={word}>{word}</span>)}</p>
        </div>
      )}

      {onSignIn && (
        <p className="guest-note">
          This result is saved in this browser only. <button className="link" onClick={onSignIn}>Sign in</button> to keep your history everywhere and appear on leaderboards.
        </p>
      )}

      <div className="actions">
        <button className="primary" onClick={onAgain}>Type it again <kbd>Enter</kbd></button>
        {onLeaderboard && <button className="ghost" onClick={onLeaderboard}>Leaderboard</button>}
        <button className="ghost" onClick={onNewSong}>{onLeaderboard ? 'New song' : 'Back to practice'} <kbd>Esc</kbd></button>
      </div>
    </section>
  )
}
