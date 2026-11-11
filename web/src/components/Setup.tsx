import { useEffect, useMemo, useState } from 'react'
import { api, ApiError, audioCredit, type AudioCandidate, type AudioLookup, type Mode, type Song } from '../engine/api'
import { fitFor, type Fit } from '../engine/catalog'
import { formatTime } from '../engine/format'
import { MODE_LABEL, type ResultRecord } from '../engine/storage'
import { Leaderboard } from './Leaderboard'
import { TrendChart } from './TrendChart'

interface Props {
  songId: number
  artUrl: string | null
  username: string | null
  /** The typist's earlier attempts at this song, oldest first. */
  attempts: ResultRecord[]
  /** The typist's speed in WPM, from their history or their own setting. */
  speed: number
  /** Recordings that already failed to play here. */
  skip: string[]
  onStart: (song: Song, mode: Mode, audio: AudioCandidate | null, follow: boolean) => void
  onBack: () => void
}

const MODES: { id: Mode; name: string; detail: string }[] = [
  { id: 'both', name: 'Audio + text', detail: 'The song plays and the lyrics stay on screen, with the sung line marked.' },
  { id: 'audio', name: 'Audio only', detail: 'Lyrics stay hidden. Type what you hear. Capitals and punctuation are ignored.' },
  { id: 'text', name: 'Text only', detail: 'No music. Type the full lyrics at your own pace.' },
]

const FIT_NOTE: Record<Fit, string> = {
  easy: 'Easy at your speed',
  match: 'A good match for your speed',
  stretch: 'A stretch for your speed',
  beyond: 'Much faster than you type. Try Text only, or Sing as I type',
}

export function Setup({ songId, artUrl, username, attempts, speed, skip, onStart, onBack }: Props) {
  const [song, setSong] = useState<Song | null>(null)
  const [lookup, setLookup] = useState<AudioLookup | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('both')
  const [choice, setChoice] = useState(0)
  const [follow, setFollow] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getSong(songId)
      .then((data) => { if (!cancelled) setSong(data) })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load this song.') })
    api.getAudio(songId)
      .then((data) => { if (!cancelled) setLookup(data) })
      .catch(() => { if (!cancelled) setLookup({ candidates: [], error: true }) })
    return () => { cancelled = true }
  }, [songId])

  const candidates = useMemo(() => (lookup?.candidates ?? []).filter((c) => !skip.includes(c.trackId)), [lookup, skip])
  const audio = candidates.length ? candidates[choice % candidates.length] : null
  const needsAudio = mode !== 'text'
  const canStart = song !== null && song.typeable && (!needsAudio || audio !== null)
  const words = useMemo(() => song?.lines.reduce((total, line) => total + line.text.split(' ').length, 0) ?? 0, [song])

  if (error) {
    return (
      <section className="setup">
        <p className="form-error" role="alert">{error}</p>
        <button className="ghost" onClick={onBack}>Back to home</button>
      </section>
    )
  }
  if (!song) return <section className="setup"><p className="muted">Loading the lyrics…</p></section>

  const pace = song.duration > 0 ? Math.round(song.length / 5 / (song.duration / 60)) : 0

  return (
    <section className="setup">
      <button className="back" onClick={onBack}>← Home</button>
      <div className="song-head">
        {artUrl && <img className="art" src={artUrl} alt="" />}
        <div>
          <h1>{song.title}</h1>
          <p className="lede">{song.artist}{song.album && ` · ${song.album}`}</p>
          <p className="muted">
            {words.toLocaleString()} words · {formatTime(song.duration)} · {song.synced ? 'timed lyrics' : 'plain lyrics, no line timing'}
            {pace > 0 && ` · about ${pace} WPM to keep up with the singer`}
          </p>
          {pace > 0 && <p className={`fit fit-${fitFor(pace, speed)}`}>{FIT_NOTE[fitFor(pace, speed)]} ({speed} WPM).</p>}
        </div>
      </div>
      {!song.typeable && <p className="form-error">These lyrics are mostly in a non-Latin script, so they can't be scored on a standard keyboard.</p>}

      <div className="modes" role="radiogroup" aria-label="Mode">
        {MODES.map((option) => (
          <button key={option.id} role="radio" aria-checked={mode === option.id} className={mode === option.id ? 'mode picked' : 'mode'} onClick={() => setMode(option.id)}>
            <strong>{option.name}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>

      {needsAudio && (
        <div className="audio-pick">
          {audio ? (
            <div className="audio-row">
              <strong>{audio.title}</strong>
              <span className="muted">{audioCredit(audio)} · {formatTime(audio.duration)}</span>
              {candidates.length > 1 && <button className="link" onClick={() => setChoice((c) => c + 1)}>Use another recording</button>}
            </div>
          ) : !lookup ? (
            <p className="muted">Looking for the audio…</p>
          ) : lookup.error ? (
            <p className="muted">The audio service is unavailable right now. Text only still works.</p>
          ) : (
            <p className="muted">No full-length audio found for this song. Text only still works.</p>
          )}
          {mode === 'both' && audio && song.synced && (
            <label className="option">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
              <span>
                <strong>Sing as I type</strong>
                <small>Each word is sung as you type it. The song waits for you and never runs ahead. Word timing is estimated, so it can be slightly early or late.</small>
              </span>
            </label>
          )}
        </div>
      )}

      <button className="primary start" disabled={!canStart} onClick={() => onStart(song, mode, needsAudio ? audio : null, mode === 'both' && follow && song.synced)}>Start typing</button>

      <div className="song-boards">
        <section>
          <h2>Your record</h2>
          {attempts.length === 0 ? (
            <p className="muted">You haven't typed this song yet.</p>
          ) : (
            <>
              <ul className="record">
                {MODES.filter((option) => attempts.some((a) => a.mode === option.id)).map((option) => {
                  const runs = attempts.filter((a) => a.mode === option.id)
                  return (
                    <li key={option.id}>
                      <span>{MODE_LABEL[option.id]}</span>
                      <strong>{Math.max(...runs.map((a) => a.wpm))} WPM</strong>
                      <small>best of {runs.length} {runs.length === 1 ? 'attempt' : 'attempts'}</small>
                    </li>
                  )
                })}
              </ul>
              {attempts.length > 1 && (
                <TrendChart title="Your speed on this song" values={attempts.map((a) => a.wpm)} labels={attempts.map((_, i) => `Attempt ${i + 1}`)} unit="WPM" color="var(--accent)" height={130} />
              )}
            </>
          )}
        </section>
        <Leaderboard songId={songId} mode={mode} username={username} />
      </div>
    </section>
  )
}
