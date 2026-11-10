// Typing Behaviour Analyzer (vision Section 5.1).
// Stage one is rule-based: it turns session metrics into severity scores for the
// six weakness categories and folds them into a profile that persists across
// sessions. The same feature set is what a later Random Forest / XGBoost
// classifier would be trained on.

import type { SessionMetrics } from './typing'

export type WeaknessCategory = 'characters' | 'combinations' | 'capitals' | 'symbols' | 'consistency' | 'endurance'

export const CATEGORY_LABELS: Record<WeaknessCategory, string> = {
  characters: 'Character mistakes',
  combinations: 'Letter combinations',
  capitals: 'Capitalization',
  symbols: 'Punctuation & symbols',
  consistency: 'Speed consistency',
  endurance: 'Accuracy over time',
}

export interface TypingProfile {
  sessions: number
  /** 0 (no issue) - 1 (severe), exponential moving average across sessions. */
  severity: Record<WeaknessCategory, number>
  /** Lifetime [attempts, errors] per character. */
  chars: Record<string, [number, number]>
  /** Lifetime [attempts, errors, total ms] per letter pair. */
  bigrams: Record<string, [number, number, number]>
}

export const emptyProfile = (): TypingProfile => ({
  sessions: 0,
  severity: { characters: 0, combinations: 0, capitals: 0, symbols: 0, consistency: 0, endurance: 0 },
  chars: {},
  bigrams: {},
})

const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function sessionSeverity(m: SessionMetrics): Record<WeaknessCategory, number> {
  const letterErrorRate = m.keystrokes ? m.errors / m.keystrokes : 0
  const bigramValues = Object.values(m.bigramStats)
  const avgTransition = bigramValues.reduce((s, [, , ms]) => s + ms, 0) / Math.max(1, bigramValues.reduce((s, [n]) => s + n, 0))
  // Pairs that are much slower than the player's own average show a combination weakness.
  const slowPairs = bigramValues.filter(([n, e, ms]) => n >= 2 && (ms / n > avgTransition * 1.8 || e / n > 0.25)).length
  return {
    characters: clamp(letterErrorRate * 6),
    combinations: clamp(slowPairs / Math.max(4, bigramValues.length * 0.25)),
    capitals: m.capitalAttempts >= 2 ? clamp((m.capitalErrors / m.capitalAttempts) * 3) : 0,
    symbols: m.symbolAttempts >= 3 ? clamp((m.symbolErrors / m.symbolAttempts) * 3) : 0,
    consistency: clamp((70 - m.consistency) / 50),
    endurance: clamp(Math.max(m.accuracyDrop / 12, m.speedDrop / 40)),
  }
}

export function updateProfile(profile: TypingProfile, m: SessionMetrics): TypingProfile {
  const fresh = sessionSeverity(m)
  const weight = profile.sessions === 0 ? 1 : 0.35
  const severity = { ...profile.severity }
  for (const key of Object.keys(severity) as WeaknessCategory[]) {
    // Categories the passage could not test (e.g. no capitals) keep their old value.
    const testable = !(key === 'capitals' && m.capitalAttempts < 2) && !(key === 'symbols' && m.symbolAttempts < 3)
    if (testable) severity[key] = Math.round((severity[key] * (1 - weight) + fresh[key] * weight) * 100) / 100
  }
  const chars = { ...profile.chars }
  for (const [char, [n, e]] of Object.entries(m.charStats)) {
    const prev = chars[char] ?? [0, 0]
    chars[char] = [prev[0] + n, prev[1] + e]
  }
  const bigrams = { ...profile.bigrams }
  for (const [pair, [n, e, ms]] of Object.entries(m.bigramStats)) {
    const prev = bigrams[pair] ?? [0, 0, 0]
    bigrams[pair] = [prev[0] + n, prev[1] + e, prev[2] + ms]
  }
  return { sessions: profile.sessions + 1, severity, chars, bigrams }
}

/** Characters the player misses most often (at least 3 attempts). */
export function weakChars(profile: TypingProfile, limit = 5): { char: string; rate: number }[] {
  return Object.entries(profile.chars)
    .filter(([char, [n, e]]) => n >= 3 && e > 0 && char !== ' ')
    .map(([char, [n, e]]) => ({ char, rate: e / n }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit)
}

/** Letter pairs with the most errors or slowest transitions relative to the player's average. */
export function weakBigrams(profile: TypingProfile, limit = 5): { pair: string; ms: number; rate: number }[] {
  const entries = Object.entries(profile.bigrams).filter(([, [n]]) => n >= 2)
  const totalN = entries.reduce((s, [, [n]]) => s + n, 0)
  const avg = entries.reduce((s, [, [, , ms]]) => s + ms, 0) / Math.max(1, totalN)
  return entries
    .map(([pair, [n, e, ms]]) => ({ pair, ms: Math.round(ms / n), rate: e / n, score: e / n + (ms / n) / Math.max(avg, 1) - 1 }))
    .filter((item) => item.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ pair, ms, rate }) => ({ pair, ms, rate }))
}

export function topWeakness(profile: TypingProfile): WeaknessCategory | null {
  const [key, value] = (Object.entries(profile.severity) as [WeaknessCategory, number][]).sort((a, b) => b[1] - a[1])[0]
  return value >= 0.2 ? key : null
}
