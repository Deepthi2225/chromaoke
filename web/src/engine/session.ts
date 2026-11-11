// One attempt at one song. The lyrics are typed word by word: Space moves on, so a
// mistake stays inside its word instead of shifting everything after it.

import type { LyricLine, Mode } from './api'
import { computeMetrics, type Keystroke, type SessionMetrics } from './typing'

export interface Word {
  text: string
  line: number
  /** Position of the word's first character in the whole song. */
  start: number
}

export interface LineGroup {
  line: number
  words: number[]
}

export interface SessionResult {
  metrics: SessionMetrics
  correctCharacters: number
  completion: number
  wordsCorrect: number
  wordsTotal: number
  missed: string[]
}

export type WordState = 'correct' | 'wrong' | 'missed' | 'active' | 'pending'

const MAX_EXTRA_CHARS = 6
const RESYNC_WINDOW = 6
const RESYNC_MIN_LENGTH = 3
const MIN_SCORABLE_CHARS = 10
const MIN_SCORABLE_MS = 2000

/** By ear you can't hear capitals or punctuation, so audio-only compares bare letters and digits. */
const relax = (word: string) => word.toLowerCase().replace(/[^a-z0-9]/g, '')

export function buildWords(lines: LyricLine[], relaxed: boolean): Word[] {
  const words: Word[] = []
  let position = 0
  lines.forEach((line, index) => {
    for (const raw of line.text.split(' ')) {
      const text = relaxed ? relax(raw) : raw
      if (!text) continue
      words.push({ text, line: index, start: position })
      position += text.length + 1
    }
  })
  return words
}

export class LyricSession {
  readonly relaxed: boolean
  readonly words: Word[]
  readonly groups: LineGroup[]
  readonly typed: string[]
  cursor = 0
  done = false
  startedAt: number | null = null
  private log: Keystroke[] = []
  private errors = 0
  private characters = 0
  /** Audio-only scores a word when it is finished, once it knows which word was meant. */
  private heldTimes: number[] = []

  constructor(lines: LyricLine[], mode: Mode) {
    this.relaxed = mode === 'audio'
    this.words = buildWords(lines, this.relaxed)
    this.typed = this.words.map(() => '')
    const groups = new Map<number, number[]>()
    this.words.forEach((word, index) => groups.set(word.line, [...(groups.get(word.line) ?? []), index]))
    this.groups = [...groups].map(([line, words]) => ({ line, words }))
  }

  get currentLine() {
    return this.words[Math.min(this.cursor, this.words.length - 1)]?.line ?? 0
  }

  wordState(index: number): WordState {
    if (index === this.cursor) return 'active'
    if (index > this.cursor) return 'pending'
    if (this.typed[index] === this.words[index].text) return 'correct'
    return this.typed[index] ? 'wrong' : 'missed'
  }

  private elapsed(now: number) {
    this.startedAt ??= now
    return now - this.startedAt
  }

  private record(key: Keystroke) {
    this.log.push(key)
    if (key.kind !== 'char') return
    this.characters += 1
    if (!key.correct) this.errors += 1
  }

  type(rawChar: string, now: number) {
    if (this.done) return
    const char = this.relaxed ? rawChar.toLowerCase() : rawChar
    if (this.relaxed && !/[a-z0-9]/.test(char)) return
    const word = this.words[this.cursor]
    const position = this.typed[this.cursor].length
    if (position >= word.text.length + MAX_EXTRA_CHARS) return

    const t = this.elapsed(now)
    this.typed[this.cursor] += char
    if (this.relaxed) {
      this.heldTimes.push(t)
      if (this.cursor === this.words.length - 1 && this.typed[this.cursor] === word.text) this.commitHeld(now)
      return
    }
    const expected = word.text[position] ?? ' '
    this.record({ t, kind: 'char', index: word.start + position, expected, typed: char, correct: char === expected })
    if (this.cursor === this.words.length - 1 && this.typed[this.cursor] === word.text) this.advance(this.words.length)
  }

  /** Space, or Enter at a line end. Ignored before a word starts, so a double space costs nothing. */
  space(now: number) {
    if (this.done || !this.typed[this.cursor]) return
    if (this.relaxed) return this.commitHeld(now)
    const word = this.words[this.cursor]
    const typed = this.typed[this.cursor]
    const correct = typed === word.text
    this.record({ t: this.elapsed(now), kind: 'char', index: word.start + typed.length, expected: word.text[typed.length] ?? ' ', typed: ' ', correct })
    this.advance(this.cursor + 1)
  }

  backspace(now: number) {
    if (this.done || this.startedAt === null) return
    const typed = this.typed[this.cursor]
    if (typed) {
      this.typed[this.cursor] = typed.slice(0, -1)
      if (this.relaxed) this.heldTimes.pop()
    } else if (!this.relaxed && this.cursor > 0 && this.wordState(this.cursor - 1) === 'wrong') {
      this.cursor -= 1
    } else {
      return
    }
    this.record({ t: this.elapsed(now), kind: 'backspace', index: this.words[this.cursor].start + this.typed[this.cursor].length })
  }

  /** Audio-only catch-up: drop anything unfinished and move to the line being sung. */
  jumpToLine(line: number) {
    if (this.done || !this.relaxed) return
    const target = this.words.findIndex((word) => word.line >= line)
    if (target <= this.cursor) return
    this.typed[this.cursor] = ''
    this.heldTimes = []
    this.cursor = target
  }

  private advance(next: number) {
    this.cursor = next
    this.done = next >= this.words.length
  }

  private commitHeld(now: number) {
    const attempt = this.typed[this.cursor]
    let target = this.cursor
    // A listener who missed a word is usually typing a later one, so look for it just ahead.
    if (attempt !== this.words[this.cursor].text && attempt.length >= RESYNC_MIN_LENGTH) {
      const last = Math.min(this.words.length - 1, this.cursor + RESYNC_WINDOW)
      for (let i = this.cursor + 1; i <= last; i++) {
        if (this.words[i].text === attempt) {
          target = i
          break
        }
      }
    }
    this.typed[this.cursor] = ''
    this.typed[target] = attempt

    const word = this.words[target]
    const times = this.heldTimes
    this.heldTimes = []
    ;[...attempt].forEach((char, i) => {
      const expected = word.text[i] ?? ' '
      this.record({ t: times[i], kind: 'char', index: word.start + i, expected, typed: char, correct: char === expected })
    })
    if (target < this.words.length - 1) {
      this.record({ t: this.elapsed(now), kind: 'char', index: word.start + attempt.length, expected: ' ', typed: ' ', correct: attempt === word.text })
    }
    this.advance(target + 1)
  }

  private correctCharacters() {
    let total = 0
    this.words.forEach((word, index) => {
      const typed = this.typed[index]
      for (let i = 0; i < Math.min(typed.length, word.text.length); i++) if (typed[i] === word.text[i]) total += 1
      if (index < this.cursor && index < this.words.length - 1 && typed === word.text) total += 1
    })
    return total
  }

  live(now: number) {
    const minutes = this.startedAt === null ? 0 : (now - this.startedAt) / 60000
    return {
      wpm: minutes > 0.05 ? Math.round(this.correctCharacters() / 5 / minutes) : 0,
      accuracy: this.characters ? Math.round(((this.characters - this.errors) / this.characters) * 100) : 100,
      errors: this.errors,
      progress: Math.round((Math.min(this.cursor, this.words.length) / this.words.length) * 100),
    }
  }

  /** Null when too little was typed for the numbers to mean anything. */
  finish(now: number): SessionResult | null {
    if (!this.done && this.relaxed && this.typed[this.cursor]) this.commitHeld(now)
    const end = this.log.at(-1)?.t ?? 0
    const correctCharacters = this.correctCharacters()
    if (correctCharacters < MIN_SCORABLE_CHARS || end < MIN_SCORABLE_MS) return null

    const passed = this.words.slice(0, this.cursor)
    const attempted = this.typed.filter(Boolean).length
    const missedAt = passed.map((_, index) => index).filter((index) => this.typed[index] !== this.words[index].text)
    return {
      metrics: computeMetrics(this.log, correctCharacters, end),
      correctCharacters,
      completion: Math.round((attempted / this.words.length) * 100),
      wordsCorrect: passed.length - missedAt.length,
      wordsTotal: this.words.length,
      missed: [...new Set(missedAt.map((index) => this.words[index].text))],
    }
  }
}
