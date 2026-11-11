import { useEffect, useState } from 'react'
import { api, type LeaderboardEntry, type Mode } from '../engine/api'
import { MODE_LABEL } from '../engine/storage'

interface Props {
  songId: number
  /** One mode, or null for every mode together. */
  mode: Mode | null
  /** Only runs finished today (UTC). */
  today?: boolean
  /** The signed-in user, to mark their own row. */
  username: string | null
}

export function Leaderboard({ songId, mode, today = false, username }: Props) {
  const [board, setBoard] = useState<{ key: string; entries: LeaderboardEntry[] } | null>(null)
  const key = `${songId}-${mode}-${today}`

  useEffect(() => {
    let cancelled = false
    api.getLeaderboard(songId, mode, today)
      .then(({ entries }) => { if (!cancelled) setBoard({ key, entries }) })
      .catch(() => { if (!cancelled) setBoard({ key, entries: [] }) })
    return () => { cancelled = true }
  }, [key, mode, songId, today])

  const entries = board?.key === key ? board.entries : null
  const scope = today ? 'today' : mode ? `in ${MODE_LABEL[mode]}` : 'yet'

  return (
    <section className="leaderboard">
      <h2>{today ? "Today's board" : `Leaderboard${mode ? ` · ${MODE_LABEL[mode]}` : ''}`}</h2>
      {entries === null ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No one has finished this song {scope}. {username ? 'Finish it to take first place.' : 'Sign in and finish it to take first place.'}</p>
      ) : (
        <table>
          <thead>
            <tr><th className="num">#</th><th>Typist</th>{!mode && <th>Mode</th>}<th className="num">WPM</th><th className="num">Accuracy</th></tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.username} className={entry.username === username ? 'you' : ''}>
                <td className="num">{index + 1}</td>
                <td>{entry.username}{entry.username === username && ' (you)'}</td>
                {!mode && <td>{MODE_LABEL[entry.mode]}</td>}
                <td className="num">{entry.wpm}</td>
                <td className="num">{entry.accuracy}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">Each typist's best run that covered at least 90% of the song.</p>
    </section>
  )
}
