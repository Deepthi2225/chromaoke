// Client for the FastAPI backend.

import type { KeyStats } from './keys'
import type { ResultRecord } from './storage'
import type { SessionResult } from './session'

const TOKEN_KEY = 'lyric-typer-token'

export type Mode = 'audio' | 'both' | 'text'

export interface SongSummary {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  synced: boolean
  typeable: boolean
}

export interface LyricLine {
  /** Seconds into the song, or null when this song only has untimed lyrics. */
  t: number | null
  text: string
}

export interface Song extends SongSummary {
  lines: LyricLine[]
  length: number
}

export interface AudioCandidate {
  trackId: string
  source: 'audius' | 'jiosaavn'
  title: string
  uploader: string
  duration: number
  streamUrl: string
}

export const audioCredit = (audio: AudioCandidate) =>
  audio.source === 'audius' ? `Community upload by ${audio.uploader} on Audius` : `${audio.uploader} on JioSaavn`

export interface AudioLookup {
  candidates: AudioCandidate[]
  error: boolean
}

export interface LeaderboardEntry {
  username: string
  wpm: number
  accuracy: number
  mode: Mode
  songId: number
  title: string
}

export interface Leaderboards {
  typists: LeaderboardEntry[]
  songs: { songId: number; title: string; artist: string; plays: number }[]
}

export interface AccountData {
  username: string
  history: ResultRecord[]
  keyStats: KeyStats
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked: the sign-in just won't survive a reload.
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server.')
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data?.detail
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, '')).join(', ') : `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }
  return data as T
}

export const api = {
  async register(username: string, password: string) {
    const result = await request<{ token: string; username: string }>('POST', '/auth/register', { username, password })
    setToken(result.token)
    return result.username
  },
  async login(username: string, password: string) {
    const result = await request<{ token: string; username: string }>('POST', '/auth/login', { username, password })
    setToken(result.token)
    return result.username
  },
  async logout() {
    try {
      await request<void>('POST', '/auth/logout')
    } finally {
      setToken(null)
    }
  },
  forgetToken: () => setToken(null),
  me: () => request<AccountData>('GET', '/me'),
  clearHistory: () => request<void>('DELETE', '/me/history'),
  async deleteAccount() {
    await request<void>('DELETE', '/me')
    setToken(null)
  },

  searchSongs: (query: string) => request<{ results: SongSummary[] }>('GET', `/songs/search?q=${encodeURIComponent(query)}`),
  getSong: (id: number) => request<Song>('GET', `/songs/${id}`),
  getArt: (id: number) => request<{ url: string | null }>('GET', `/songs/${id}/art`),
  getLeaderboard: (id: number, mode: Mode | null, today: boolean) =>
    request<{ entries: LeaderboardEntry[] }>('GET', `/songs/${id}/leaderboard?today=${today}${mode ? `&mode=${mode}` : ''}`),
  getLeaderboards: () => request<Leaderboards>('GET', '/leaderboards'),
  getAudio: (id: number) => request<AudioLookup>('GET', `/songs/${id}/audio`),

  addKeyStats: (stats: KeyStats) => request<void>('POST', '/me/keys', stats),

  submitResult(songId: number, mode: Mode, result: SessionResult, keyStats: KeyStats) {
    const m = result.metrics
    return request<{ record: ResultRecord }>('POST', '/results', {
      song_id: songId,
      mode,
      elapsed_seconds: m.elapsedSeconds,
      correct_characters: result.correctCharacters,
      keystrokes: m.keystrokes,
      errors: m.errors,
      backspaces: m.backspaces,
      consistency: m.consistency,
      burst_wpm: m.burstWpm,
      completion: result.completion,
      key_stats: keyStats,
    })
  },
}
