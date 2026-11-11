import { useEffect, useState } from 'react'
import { api, type Leaderboards as Boards } from '../engine/api'
import { songOfTheDay } from '../engine/catalog'
import { Leaderboard } from './Leaderboard'

interface Props {
  username: string | null
  onPick: (songId: number) => void
}

export function Leaderboards({ username, onPick }: Props) {
  const [boards, setBoards] = useState<Boards | null>(null)
  const [failed, setFailed] = useState(false)
  const daily = songOfTheDay()

  useEffect(() => {
    let cancelled = false
    api.getLeaderboards()
      .then((data) => { if (!cancelled) setBoards(data) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  return (
    <section className="boards">
      <h1>Leaderboards</h1>

      <div className="daily-card">
        <div>
          <p className="eyebrow">Song of the day</p>
          <h2>{daily.title}</h2>
          <p className="muted">{daily.artist} · {daily.pace} WPM keeps up with the singer · a fresh board every day</p>
        </div>
        <button className="primary" onClick={() => onPick(daily.id)}>Type it</button>
      </div>
      <Leaderboard songId={daily.id} mode={null} today username={username} />

      <h2 className="spaced">Top typists</h2>
      {failed ? (
        <p className="muted">The leaderboards are unavailable right now.</p>
      ) : !boards ? (
        <p className="muted">Loading…</p>
      ) : boards.typists.length === 0 ? (
        <p className="muted">No full runs yet. Sign in, finish a song, and this is yours.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th className="num">#</th><th>Typist</th><th className="num">Best WPM</th><th className="num">Accuracy</th><th>On</th></tr>
            </thead>
            <tbody>
              {boards.typists.map((entry, index) => (
                <tr key={entry.username} className={entry.username === username ? 'you' : ''}>
                  <td className="num">{index + 1}</td>
                  <td>{entry.username}{entry.username === username && ' (you)'}</td>
                  <td className="num">{entry.wpm}</td>
                  <td className="num">{entry.accuracy}%</td>
                  <td><button className="link" onClick={() => onPick(entry.songId)}>{entry.title}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">Each typist's fastest run that covered at least 90% of a song, in any mode.</p>

      {boards && boards.songs.length > 0 && (
        <>
          <h2 className="spaced">Most played this week</h2>
          <ul className="results">
            {boards.songs.map((song) => (
              <li key={song.songId}>
                <button onClick={() => onPick(song.songId)}>
                  <span className="result-title">{song.title}</span>
                  <span className="result-artist">{song.artist}</span>
                  <span className="result-meta">{song.plays} {song.plays === 1 ? 'play' : 'plays'}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
