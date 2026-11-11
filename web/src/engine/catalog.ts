// Songs to suggest, each checked to have timed lyrics and audio, matched to how fast someone types.

import { LETTER_SHARES } from './letterShares'
import type { ResultRecord } from './storage'

export interface CatalogSong {
  id: number
  title: string
  artist: string
  /** Typing speed, in WPM, that keeps up with the singer. */
  pace: number
}

export const CATALOG: CatalogSong[] = [
  { id: 34804802, title: "Can't Help Falling in Love", artist: 'Elvis Presley', pace: 34 },
  { id: 34336849, title: 'Fix You', artist: 'Coldplay', pace: 36 },
  { id: 31185608, title: 'Imagine', artist: 'John Lennon', pace: 40 },
  { id: 1122992, title: 'Hallelujah', artist: 'Jeff Buckley', pace: 43 },
  { id: 32785523, title: 'Tum Hi Ho', artist: 'Arijit Singh', pace: 43 },
  { id: 35866199, title: 'Stand by Me', artist: 'Ben E. King', pace: 48 },
  { id: 12380769, title: 'Kesariya', artist: 'Arijit Singh', pace: 57 },
  { id: 37018249, title: 'Lean on Me', artist: 'Bill Withers', pace: 60 },
  { id: 1524656, title: 'Hey Jude', artist: 'The Beatles', pace: 62 },
  { id: 33614444, title: 'Perfect', artist: 'Ed Sheeran', pace: 66 },
  { id: 33770390, title: 'Viva La Vida', artist: 'Coldplay', pace: 72 },
  { id: 33610148, title: 'Someone Like You', artist: 'Adele', pace: 73 },
  { id: 36523298, title: 'Blinding Lights', artist: 'The Weeknd', pace: 73 },
  { id: 34480300, title: 'Dandelions', artist: 'Ruth B.', pace: 83 },
  { id: 3204965, title: 'Riptide', artist: 'Vance Joy', pace: 107 },
  { id: 39992391, title: 'Happy', artist: 'Pharrell Williams', pace: 115 },
  { id: 3204708, title: 'Believer', artist: 'Imagine Dragons', pace: 121 },
  { id: 2174817, title: "We Didn't Start the Fire", artist: 'Billy Joel', pace: 126 },
  { id: 3693592, title: 'Stressed Out', artist: 'Twenty One Pilots', pace: 139 },
  { id: 27328, title: 'Lose Yourself', artist: 'Eminem', pace: 152 },
  { id: 33998210, title: 'Shake It Off', artist: 'Taylor Swift', pace: 153 },
  { id: 39394399, title: "It's the End of the World as We Know It", artist: 'R.E.M.', pace: 157 },
  { id: 14289130, title: "Can't Hold Us", artist: 'Macklemore', pace: 160 },
  { id: 33790163, title: 'Shape of You', artist: 'Ed Sheeran', pace: 162 },
  { id: 1121926, title: 'One Week', artist: 'Barenaked Ladies', pace: 211 },
  { id: 27766403, title: 'Mockingbird', artist: 'Eminem', pace: 214 },
  { id: 972456, title: 'Rap God', artist: 'Eminem', pace: 263 },
]

const DAY_MS = 86_400_000
const DAILY_MAX_PACE = 130 // the daily song should be one most people can keep up with

/** The same song for everyone on a given UTC day. */
export function songOfTheDay(now = Date.now()): CatalogSong {
  const pool = CATALOG.filter((song) => song.pace <= DAILY_MAX_PACE)
  return pool[Math.floor(now / DAY_MS) % pool.length]
}

export const DEFAULT_SPEED = 40 // a typical typing speed, used until we know better
export const MIN_SPEED = 15
export const MAX_SPEED = 200
const RECENT_RESULTS = 5
const PER_GROUP = 4

/** A song's pace relative to the typist's speed. */
const EASY_BELOW = 0.75
const MATCH_UP_TO = 1.1
const STRETCH_UP_TO = 1.4

export type Fit = 'easy' | 'match' | 'stretch' | 'beyond'

export function fitFor(pace: number, speed: number): Fit {
  const ratio = pace / speed
  return ratio < EASY_BELOW ? 'easy' : ratio <= MATCH_UP_TO ? 'match' : ratio <= STRETCH_UP_TO ? 'stretch' : 'beyond'
}

/** The typist's current speed: the average of their latest results, or null with no history. */
export function speedFromHistory(history: ResultRecord[]): number | null {
  const latest = history.slice(-RECENT_RESULTS)
  if (!latest.length) return null
  return Math.round(latest.reduce((total, record) => total + record.wpm, 0) / latest.length)
}

const share = (songId: number, letter: string) => LETTER_SHARES[songId]?.[letter.charCodeAt(0) - 97] ?? 0
const RICH_ABOVE_AVERAGE = 1.1

/**
 * Songs whose lyrics use the given weak letters more than the catalogue average, best first.
 * `rich` lists which of those letters each song is heavy in. Songs far faster than the typist are left out.
 */
export function songsForKeys(weak: { key: string; rate: number }[], speed: number): { song: CatalogSong; rich: string[] }[] {
  const average = (letter: string) => CATALOG.reduce((total, song) => total + share(song.id, letter), 0) / CATALOG.length || 1
  const reachable = CATALOG.filter((song) => fitFor(song.pace, speed) !== 'beyond')
  return (reachable.length >= PER_GROUP ? reachable : CATALOG)
    .map((song) => ({
      song,
      rich: weak.filter(({ key }) => share(song.id, key) >= average(key) * RICH_ABOVE_AVERAGE).map(({ key }) => key),
      // Each weak letter counts by how much more than usual the song uses it, weighted by how often it is missed.
      score: weak.reduce((total, { key, rate }) => total + rate * (share(song.id, key) / average(key)), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, PER_GROUP)
}

/** Up to four songs per group, nearest the typist's speed first, skipping songs they have already typed. */
export function suggest(speed: number, played: Set<number>): Record<Exclude<Fit, 'beyond'>, CatalogSong[]> {
  const fresh = CATALOG.filter((song) => !played.has(song.id))
  const pool = fresh.length >= PER_GROUP ? fresh : CATALOG
  const nearest = (fit: Fit) =>
    pool.filter((song) => fitFor(song.pace, speed) === fit).sort((a, b) => Math.abs(a.pace - speed) - Math.abs(b.pace - speed)).slice(0, PER_GROUP)
  return { easy: nearest('easy'), match: nearest('match'), stretch: nearest('stretch') }
}
