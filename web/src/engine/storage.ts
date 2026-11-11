// Guest history in localStorage. Only summaries are kept, never lyrics or typed text.

import type { Mode } from './api'
import { emptyKeyStats, type KeyStats } from './keys'

export interface ResultRecord {
  at: number
  songId: number
  title: string
  artist: string
  mode: Mode
  wpm: number
  accuracy: number
  consistency: number
  completion: number
}

const KEY = 'lyric-typer-history-v1'
const HISTORY_LIMIT = 200

export function loadHistory(): ResultRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeHistory(history: ResultRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)))
  } catch {
    // Storage can be unavailable (private mode); the results still show for this visit.
  }
}

const KEYS_KEY = 'lyric-typer-keys-v1'

export function loadKeyStats(): KeyStats {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYS_KEY) ?? 'null')
    return parsed?.keys && parsed?.pairs ? parsed : emptyKeyStats()
  } catch {
    return emptyKeyStats()
  }
}

export function writeKeyStats(stats: KeyStats) {
  try {
    localStorage.setItem(KEYS_KEY, JSON.stringify(stats))
  } catch {
    // Storage blocked: weak keys are tracked for this visit only.
  }
}

const SPEED_KEY = 'lyric-typer-chosen-speed'

/** The typing speed the person set by hand for suggestions, or null to follow their history. */
export function loadChosenSpeed(): number | null {
  try {
    const value = Number(localStorage.getItem(SPEED_KEY))
    return value > 0 ? value : null
  } catch {
    return null
  }
}

export function writeChosenSpeed(speed: number | null) {
  try {
    if (speed === null) localStorage.removeItem(SPEED_KEY)
    else localStorage.setItem(SPEED_KEY, String(speed))
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}

export const MODE_LABEL: Record<Mode, string> = { audio: 'Audio only', both: 'Audio + text', text: 'Text only' }
