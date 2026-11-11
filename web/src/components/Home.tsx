import { useState, type FormEvent } from 'react'
import { api, ApiError, type SongSummary } from '../engine/api'
import { MAX_SPEED, MIN_SPEED, songOfTheDay, suggest } from '../engine/catalog'
import { formatTime } from '../engine/format'
import { MODE_LABEL, type ResultRecord } from '../engine/storage'

export interface SearchState {
  query: string
  results: SongSummary[] | null
}

interface Props {
  state: SearchState
  /** The typist's latest songs, newest first. */
  recent: ResultRecord[]
  /** Songs already typed, so suggestions favour new ones. */
  played: Set<number>
  /** The speed suggestions are matched to, and where it came from. */
  speed: number
  speedSource: 'history' | 'chosen' | 'default'
  canFollowHistory: boolean
  onChooseSpeed: (speed: number | null) => void
  /** Days practised in a row. */
  streak: number
  onLeaderboards: () => void
  onChange: (state: SearchState) => void
  onPick: (songId: number) => void
}

const GROUPS = [
  { fit: 'easy', name: 'Easy for you', hint: 'Slower than you type. Good for accuracy.' },
  { fit: 'match', name: 'Your speed', hint: 'You can keep up with the singer.' },
  { fit: 'stretch', name: 'A stretch', hint: 'A little faster than you. This is how you improve.' },
] as const

const SOURCE_NOTE = {
  history: 'Taken from your last few songs. Drag to try another speed.',
  chosen: 'Set by you.',
  default: 'A typical speed to start from. Drag to set yours, or type a song and it updates itself.',
}

const MODES = [
  { name: 'Audio + text', detail: 'The song plays, the lyrics are on screen, and the line being sung is marked.' },
  { name: 'Audio only', detail: 'The lyrics are hidden. You type what you hear.' },
  { name: 'Text only', detail: 'No music. The whole song at your own pace.' },
]

export function Home({ state, recent, played, speed, speedSource, canFollowHistory, onChooseSpeed, streak, onLeaderboards, onChange, onPick }: Props) {
  const daily = songOfTheDay()
  const suggestions = suggest(speed, played)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = state.query.trim()
    if (text.length < 2) return
    setBusy(true)
    setError('')
    try {
      const { results } = await api.searchSongs(text)
      onChange({ query: text, results })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <h1>Type the song. <em>Paint the room.</em></h1>
        <p className="lede">Typing practice with real lyrics. Every song you play colours the whole site from its album cover.</p>
        <form className="search-box" onSubmit={submit} role="search">
          <input autoFocus aria-label="Song or artist" placeholder="Search a song or artist" value={state.query} onChange={(e) => onChange({ ...state, query: e.target.value })} />
          <button className="primary" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      {state.results ? (
        <section>
          <div className="section-head">
            <h2>Results for “{state.query}”</h2>
            <button className="link" onClick={() => onChange({ query: '', results: null })}>Clear</button>
          </div>
          {state.results.length === 0 && <p className="muted">No lyrics found for that search. Try adding the artist's name.</p>}
          <ul className="results">
            {state.results.map((song) => (
              <li key={song.id}>
                <button disabled={!song.typeable} onClick={() => onPick(song.id)}>
                  <span className="result-title">{song.title}</span>
                  <span className="result-artist">{song.artist}</span>
                  <span className="result-meta">
                    {!song.typeable ? 'Non-Latin lyrics' : song.synced ? 'Timed lyrics' : 'Plain lyrics'}
                    {song.duration > 0 && ` · ${formatTime(song.duration)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="daily-card">
            <div>
              <p className="eyebrow">Song of the day{streak > 0 && ` · ${streak}-day streak`}</p>
              <h2>{daily.title}</h2>
              <p className="muted">{daily.artist} · {daily.pace} WPM keeps up with the singer · a fresh leaderboard every day</p>
            </div>
            <div className="daily-actions">
              <button className="primary" onClick={() => onPick(daily.id)}>Type it</button>
              <button className="ghost" onClick={onLeaderboards}>Today's board</button>
            </div>
          </section>

          {recent.length > 0 && (
            <section>
              <h2>Jump back in</h2>
              <ul className="recent">
                {recent.map((record) => (
                  <li key={record.songId}>
                    <button onClick={() => onPick(record.songId)}>
                      <span className="result-title">{record.title}</span>
                      <span className="result-artist">{record.artist}</span>
                      <small>Last time: {record.wpm} WPM · {record.accuracy}% · {MODE_LABEL[record.mode]}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2>Songs for your speed</h2>
            <div className="speed">
              <div className="speed-now"><strong>{speed}</strong><span>words per minute</span></div>
              <input type="range" aria-label="Your typing speed in words per minute" min={MIN_SPEED} max={MAX_SPEED} step={5} value={speed} onChange={(e) => onChooseSpeed(Number(e.target.value))} />
              <p className="muted">
                {SOURCE_NOTE[speedSource]}{' '}
                {speedSource === 'chosen' && canFollowHistory && <button className="link" onClick={() => onChooseSpeed(null)}>Use my history instead</button>}
              </p>
            </div>
            <p className="muted">The number beside each song is the typing speed that keeps up with the singer.</p>
            <div className="starters">
              {GROUPS.map((tier) => (
                <div key={tier.name} className="tier">
                  <h3>{tier.name}</h3>
                  <p className="muted">{tier.hint}</p>
                  {suggestions[tier.fit].length === 0 && <p className="muted">No songs in this range at {speed} WPM.</p>}
                  <ul>
                    {suggestions[tier.fit].map((song) => (
                      <li key={song.id}>
                        <button onClick={() => onPick(song.id)}>
                          <span className="result-title">{song.title}</span>
                          <span className="result-artist">{song.artist}</span>
                          <span className="pace">{song.pace}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Three ways to play</h2>
            <div className="ways">
              {MODES.map((mode) => (
                <div key={mode.name}>
                  <strong>{mode.name}</strong>
                  <p>{mode.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <p className="credit">
        Lyrics from <a href="https://lrclib.net" target="_blank" rel="noreferrer">LRCLIB</a>. Audio from <a href="https://audius.co" target="_blank" rel="noreferrer">Audius</a> and JioSaavn. Artwork from iTunes.
      </p>
    </div>
  )
}
