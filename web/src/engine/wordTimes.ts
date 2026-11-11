// Estimates when each word is sung. Lyrics are only timed per line, so a line's time is shared
// out among its words by length. Close enough to sing along word by word, not frame-exact.

import type { LyricLine } from './api'
import type { Word } from './session'

export interface WordTime {
  start: number
  end: number
}

/** A line followed by a long instrumental gap is not sung slowly; cap how long its words can take. */
const MAX_SECONDS_PER_CHAR = 0.3
const LINE_SLACK_SECONDS = 0.5

export function estimateWordTimes(lines: LyricLine[], words: Word[]): WordTime[] {
  const byLine = new Map<number, number[]>()
  words.forEach((word, index) => byLine.set(word.line, [...(byLine.get(word.line) ?? []), index]))

  const times = new Array<WordTime>(words.length)
  for (const [line, indexes] of byLine) {
    const start = lines[line].t ?? 0
    const chars = indexes.reduce((total, index) => total + words[index].text.length + 1, 0)
    const longest = chars * MAX_SECONDS_PER_CHAR + LINE_SLACK_SECONDS
    const nextLine = lines.slice(line + 1).find((later) => later.t !== null && later.t > start)?.t
    const length = Math.min(nextLine !== undefined && nextLine !== null ? nextLine - start : longest, longest)
    let at = start
    for (const index of indexes) {
      const share = ((words[index].text.length + 1) / chars) * length
      times[index] = { start: at, end: at + share }
      at += share
    }
  }
  return times
}
