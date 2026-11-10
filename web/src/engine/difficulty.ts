// Adaptive Difficulty Engine, stage one: rule-based (vision Section 5.2).
// Looks at speed AND accuracy: fast but sloppy typing does not get harder content.
// A contextual bandit can later replace `nextLevel` using the same inputs.

import type { Level } from '../data/missions'
import { weakBigrams, type TypingProfile } from './analyzer'
import type { SessionMetrics } from './typing'

export interface DifficultyDecision {
  level: number
  change: -1 | 0 | 1
  reason: string
}

export function nextLevel(current: number, maxLevel: number, metrics: SessionMetrics, level: Level, repaired: boolean): DifficultyDecision {
  if (!repaired || metrics.accuracy < 88) {
    const target = Math.max(1, current - 1)
    return {
      level: target,
      change: target < current ? -1 : 0,
      reason: !repaired ? 'Repair not finished in time, so the next attempt stays gentler.' : 'Accuracy under 88%: precision first, speed later.',
    }
  }
  if (metrics.accuracy >= 95 && metrics.wpm >= level.targetWpm) {
    const target = Math.min(maxLevel, current + 1)
    return {
      level: target,
      change: target > current ? 1 : 0,
      reason: target > current ? `Accuracy ${metrics.accuracy}% and ${metrics.wpm} WPM beat the level target of ${level.targetWpm}.` : 'Top level mastered.',
    }
  }
  return {
    level: current,
    change: 0,
    reason: metrics.wpm < level.targetWpm ? `Reach ${level.targetWpm} WPM at 95% accuracy to level up.` : 'Push accuracy to 95% to level up.',
  }
}

/** Prefers passages that contain the player's weak letter pairs (personalised practice). */
export function pickPassage(level: Level, profile: TypingProfile, avoid?: string): string {
  const weak = weakBigrams(profile, 8).map((item) => item.pair)
  const pool = level.passages.length > 1 ? level.passages.filter((p) => p !== avoid) : level.passages
  const scored = pool.map((passage) => {
    const lower = passage.toLowerCase()
    const hits = weak.reduce((sum, pair) => sum + (lower.split(pair).length - 1), 0)
    return { passage, score: hits + Math.random() * 0.5 }
  })
  return scored.sort((a, b) => b.score - a.score)[0].passage
}
