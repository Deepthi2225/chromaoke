// Which keys a typist misses. Only totals per letter and per letter pair are kept, never what was typed.

import type { LyricLine } from './api'
import type { SessionMetrics } from './typing'

/** [times aimed at, times missed] */
type Tally = [number, number]

export interface KeyStats {
  /** Lowercase letter a-z. */
  keys: Record<string, Tally>
  /** Two lowercase letters typed in a row, tallied on the second. */
  pairs: Record<string, Tally>
}

export interface WeakKey {
  key: string
  /** Share of attempts missed, 0 to 1. */
  rate: number
  attempts: number
  errors: number
}

export const emptyKeyStats = (): KeyStats => ({ keys: {}, pairs: {} })

/** Too few attempts says nothing: one slip in five tries is not a 20% problem. */
const MIN_KEY_ATTEMPTS = 15
const MIN_PAIR_ATTEMPTS = 6
const WEAK_RATE = 0.04
const MAX_WEAK_KEYS = 4
const MAX_WEAK_PAIRS = 3
export const ENOUGH_TYPING = 150 // letters typed before the picture means anything

const LETTER = /^[a-z]$/

/** One session's tallies, folded to lowercase letters. */
export function sessionKeyStats(metrics: SessionMetrics): KeyStats {
  const stats = emptyKeyStats()
  for (const [char, [attempts, errors]] of Object.entries(metrics.charStats)) {
    const key = char.toLowerCase()
    if (!LETTER.test(key)) continue
    const tally = (stats.keys[key] ??= [0, 0])
    tally[0] += attempts
    tally[1] += errors
  }
  for (const [pair, [attempts, errors]] of Object.entries(metrics.bigramStats)) stats.pairs[pair] = [attempts, errors]
  return stats
}

export function mergeKeyStats(a: KeyStats, b: KeyStats): KeyStats {
  const merge = (x: Record<string, Tally>, y: Record<string, Tally>) => {
    const out: Record<string, Tally> = { ...x }
    for (const [key, [attempts, errors]] of Object.entries(y)) out[key] = [(out[key]?.[0] ?? 0) + attempts, (out[key]?.[1] ?? 0) + errors]
    return out
  }
  return { keys: merge(a.keys, b.keys), pairs: merge(a.pairs, b.pairs) }
}

export const lettersTyped = (stats: KeyStats) => Object.values(stats.keys).reduce((total, [attempts]) => total + attempts, 0)

export const missRate = (stats: KeyStats, key: string): WeakKey | null => {
  const tally = stats.keys[key]
  return tally && tally[0] >= MIN_KEY_ATTEMPTS ? { key, rate: tally[1] / tally[0], attempts: tally[0], errors: tally[1] } : null
}

function weakest(tallies: Record<string, Tally>, minAttempts: number, limit: number): WeakKey[] {
  return Object.entries(tallies)
    .filter(([, [attempts, errors]]) => attempts >= minAttempts && errors / attempts >= WEAK_RATE)
    .map(([key, [attempts, errors]]) => ({ key, rate: errors / attempts, attempts, errors }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit)
}

export const weakKeys = (stats: KeyStats) => weakest(stats.keys, MIN_KEY_ATTEMPTS, MAX_WEAK_KEYS)
export const weakPairs = (stats: KeyStats) => weakest(stats.pairs, MIN_PAIR_ATTEMPTS, MAX_WEAK_PAIRS)

/** The letters that cost the most mistakes in one session, worst first. */
export function costliestKeys(metrics: SessionMetrics, limit = 3): { key: string; errors: number }[] {
  return Object.entries(sessionKeyStats(metrics).keys)
    .filter(([, [, errors]]) => errors >= 2)
    .map(([key, [, errors]]) => ({ key, errors }))
    .sort((a, b) => b.errors - a.errors)
    .slice(0, limit)
}

const MIN_DRILL_LINE = 12
const DRILL_LINES = 8

/** The lyric lines densest in the given letters and pairs, in song order, for a short drill. */
export function buildDrill(lines: LyricLine[], letters: string[], pairs: string[]): LyricLine[] {
  const seen = new Set<string>()
  const scored = lines
    .map((line, order) => {
      const text = line.text.toLowerCase()
      if (text.length < MIN_DRILL_LINE || seen.has(text)) return null
      seen.add(text)
      const hits = [...text].filter((char) => letters.includes(char)).length + 2 * pairs.reduce((total, pair) => total + text.split(pair).length - 1, 0)
      return { line, order, density: hits / text.length }
    })
    .filter((entry) => entry !== null && entry.density > 0) as { line: LyricLine; order: number; density: number }[]
  return scored
    .sort((a, b) => b.density - a.density)
    .slice(0, DRILL_LINES)
    .sort((a, b) => a.order - b.order)
    .map(({ line }) => ({ t: null, text: line.text }))
}
