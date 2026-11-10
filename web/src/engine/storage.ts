// Local persistence for the first milestone (accounts and PostgreSQL come in Phase 3).
// Only session summaries are kept, never raw keystrokes (vision Section 12),
// and the player can wipe everything from the Performance Lab.

import { MISSIONS, type MissionId } from '../data/missions'
import { emptyProfile, type TypingProfile } from './analyzer'

export interface SessionRecord {
  at: number
  mission: MissionId
  level: number
  wpm: number
  accuracy: number
  consistency: number
  repaired: boolean
  xp: number
  stars: number
}

export interface MissionProgress {
  level: number
  bestStars: number
  bestWpm: number
  repairs: number
}

export interface Settings {
  sound: boolean
  reduceMotion: boolean
  glitchEffects: boolean
}

export interface SaveData {
  xp: number
  missions: Partial<Record<MissionId, MissionProgress>>
  history: SessionRecord[]
  profile: TypingProfile
  settings: Settings
}

const KEY = 'robot-repair-save-v1'
const HISTORY_LIMIT = 200

export const defaultSave = (): SaveData => ({
  xp: 0,
  missions: {},
  history: [],
  profile: emptyProfile(),
  settings: {
    sound: true,
    reduceMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    glitchEffects: true,
  },
})

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    const base = defaultSave()
    return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings }, profile: { ...base.profile, ...parsed.profile } }
  } catch {
    return defaultSave()
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, history: data.history.slice(-HISTORY_LIMIT) }))
  } catch {
    // Storage can be unavailable (private mode); the game still works for this visit.
  }
}

/** Level thresholds: each technician rank needs 20% more XP than the last. */
export function rankFor(xp: number) {
  let rank = 1
  let need = 300
  let floor = 0
  while (xp >= floor + need) {
    floor += need
    need = Math.round(need * 1.2)
    rank += 1
  }
  return { rank, into: xp - floor, need }
}

/** A mission unlocks once the previous one has been repaired at least once. */
export const isUnlocked = (save: SaveData, index: number) => index === 0 || (save.missions[MISSIONS[index - 1].id]?.repairs ?? 0) > 0
