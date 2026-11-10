// Client for the FastAPI backend (vision Section 8). Guest play never calls this;
// signed-in players' progress, history and profile live on the server.

import type { MissionId } from '../data/missions'
import type { TypingProfile } from './analyzer'
import type { MissionProgress, SessionRecord } from './storage'
import type { SessionMetrics } from './typing'

const TOKEN_KEY = 'robot-repair-token'

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
    // ignore: the session just won't survive a reload
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
    throw new ApiError(0, 'Cannot reach the repair facility server.')
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

export interface AccountData {
  username: string
  xp: number
  missions: Partial<Record<MissionId, MissionProgress>>
  history: SessionRecord[]
  profile: TypingProfile | null
}

export interface SubmittedSession {
  record: SessionRecord
  xp: number
  stars: number
  decision: { level: number; change: -1 | 0 | 1 }
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
  submitSession(input: {
    mission: MissionId
    level: number
    passage: string
    repaired: boolean
    timeLeft: number
    correctCharacters: number
    metrics: SessionMetrics
    profile: TypingProfile
  }) {
    const m = input.metrics
    return request<SubmittedSession>('POST', '/sessions', {
      mission: input.mission,
      level: input.level,
      passage: input.passage,
      repaired: input.repaired,
      time_left: input.timeLeft,
      elapsed_seconds: m.elapsedSeconds,
      correct_characters: input.correctCharacters,
      keystrokes: m.keystrokes,
      errors: m.errors,
      backspaces: m.backspaces,
      consistency: m.consistency,
      burst_wpm: m.burstWpm,
      // Aggregated features only: counts per key and per letter pair, never the typed text.
      features: {
        charStats: m.charStats,
        bigramStats: m.bigramStats,
        capitalErrors: m.capitalErrors,
        capitalAttempts: m.capitalAttempts,
        symbolErrors: m.symbolErrors,
        symbolAttempts: m.symbolAttempts,
        accuracyDrop: m.accuracyDrop,
        speedDrop: m.speedDrop,
        correctionRate: m.correctionRate,
        rawWpm: m.rawWpm,
        wpmTimeline: m.wpmTimeline,
      },
      profile: input.profile,
    })
  },
}
