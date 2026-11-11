import { useMemo, useState } from 'react'
import { api, type Song } from '../engine/api'
import { songsForKeys } from '../engine/catalog'
import { buildDrill, ENOUGH_TYPING, lettersTyped, weakKeys, weakPairs, type KeyStats } from '../engine/keys'
import { KeyboardHeatmap } from './KeyboardHeatmap'

interface Props {
  stats: KeyStats
  /** The typist's speed, so suggested songs are ones they can keep up with. */
  speed: number
  onPick: (songId: number) => void
  onDrill: (drill: Song) => void
  onHome: () => void
}

const percent = (rate: number) => `${(rate * 100).toFixed(rate < 0.1 ? 1 : 0)}%`

export function Practice({ stats, speed, onPick, onDrill, onHome }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const letters = useMemo(() => weakKeys(stats), [stats])
  const pairs = useMemo(() => weakPairs(stats), [stats])
  const songs = useMemo(() => songsForKeys(letters, speed), [letters, speed])
  const typed = lettersTyped(stats)

  const startDrill = async () => {
    setBusy(true)
    setError('')
    try {
      // Lines come from the two best-matched songs, so a drill is real lyrics, not nonsense strings.
      const sources = await Promise.all(songs.slice(0, 2).map(({ song }) => api.getSong(song.id)))
      const lines = buildDrill(sources.flatMap((song) => song.lines), letters.map((k) => k.key), pairs.map((p) => p.key))
      if (!lines.length) throw new Error('empty')
      const targets = [...letters.map((k) => k.key.toUpperCase()), ...pairs.map((p) => p.key.toUpperCase())].join(' ')
      onDrill({
        ...sources[0],
        title: `Drill: ${targets}`,
        artist: `Lines from ${sources.map((song) => song.title).join(' and ')}`,
        synced: false,
        lines,
        length: lines.map((line) => line.text).join(' ').length,
      })
    } catch {
      setError('Could not build a drill right now. Try one of the songs below.')
      setBusy(false)
    }
  }

  if (typed < ENOUGH_TYPING) {
    return (
      <section className="practice">
        <h1>Practice</h1>
        <p className="lede">This page finds the keys you miss most and picks songs and drills that work on them.</p>
        <p className="muted">It needs a little typing first. Finish one song and it fills in.</p>
        <div className="actions"><button className="primary" onClick={onHome}>Pick a song</button></div>
      </section>
    )
  }

  return (
    <section className="practice">
      <h1>Practice</h1>
      {letters.length === 0 && pairs.length === 0 ? (
        <p className="lede">No weak keys right now. Every letter you have typed enough is under a 4% miss rate.</p>
      ) : (
        <>
          <p className="lede">The keys you miss most, from {typed.toLocaleString()} letters typed.</p>
          <div className="weak">
            {letters.map((k) => (
              <div key={k.key} className="weak-key">
                <strong>{k.key.toUpperCase()}</strong>
                <span>missed {percent(k.rate)}</span>
                <small>{k.errors} of {k.attempts}</small>
              </div>
            ))}
            {pairs.map((p) => (
              <div key={p.key} className="weak-key pair">
                <strong>{p.key.toUpperCase()}</strong>
                <span>missed {percent(p.rate)}</span>
                <small>letter pair · {p.errors} of {p.attempts}</small>
              </div>
            ))}
          </div>

          {letters.length > 0 && (
            <>
              <div className="drill">
                <div>
                  <h2>Quick drill</h2>
                  <p className="muted">About a minute of real lyric lines packed with those keys. Drills don't count toward history or leaderboards.</p>
                </div>
                <button className="primary" disabled={busy} onClick={startDrill}>{busy ? 'Building…' : 'Start drill'}</button>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}

              <h2>Songs that work on these keys</h2>
              <p className="muted">Chosen from songs you can keep up with at {speed} WPM. The letters shown appear more often than usual in that song.</p>
              <ul className="results">
                {songs.map(({ song, rich }) => (
                  <li key={song.id}>
                    <button onClick={() => onPick(song.id)}>
                      <span className="result-title">{song.title}</span>
                      <span className="result-artist">{song.artist}</span>
                      <span className="result-meta">{rich.length ? `more ${rich.map((l) => l.toUpperCase()).join(', ')}` : 'average mix'} · {song.pace} WPM</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <h2 className="spaced">Your keyboard</h2>
      <p className="muted">Redder keys are missed more often. Hover a key for its numbers.</p>
      <KeyboardHeatmap stats={stats} />
    </section>
  )
}
