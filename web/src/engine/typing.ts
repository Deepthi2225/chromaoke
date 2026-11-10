// Deterministic typing engine (vision Section 5.1 and Principle 4).
// Scoring never depends on AI: every number here is computed from the
// keystrokes the player typed against the target passage.

export interface Keystroke {
  /** ms since the session started */
  t: number
  kind: 'char' | 'backspace'
  /** Position in the passage the key was aimed at. */
  index: number
  expected?: string
  typed?: string
  correct?: boolean
}

export interface SessionMetrics {
  /** Net WPM: correct characters only. */
  wpm: number
  rawWpm: number
  /** Share of keystrokes that were correct first time (errors still count after a fix). */
  accuracy: number
  elapsedSeconds: number
  keystrokes: number
  errors: number
  backspaces: number
  /** backspaces / keystrokes */
  correctionRate: number
  /** Fastest 5-second window, in WPM. */
  burstWpm: number
  /** 0-100, higher is steadier. */
  consistency: number
  /** Accuracy in the first half minus accuracy in the second half (positive = got worse). */
  accuracyDrop: number
  /** Speed drop from the first third to the last third, in % (positive = slowed down). */
  speedDrop: number
  /** expected character -> [attempts, errors] */
  charStats: Record<string, [number, number]>
  /** two-letter sequence -> [attempts, errors, total transition ms] */
  bigramStats: Record<string, [number, number, number]>
  capitalErrors: number
  capitalAttempts: number
  symbolErrors: number
  symbolAttempts: number
  /** WPM sampled every 5 seconds, for the speed chart. */
  wpmTimeline: number[]
}

const WINDOW_MS = 5000
const isSymbol = (char: string) => /[^a-zA-Z\s]/.test(char)
const isCapital = (char: string) => /[A-Z]/.test(char)

export function computeMetrics(log: Keystroke[], correctChars: number, endTime: number): SessionMetrics {
  const chars = log.filter((key) => key.kind === 'char')
  const errors = chars.filter((key) => !key.correct).length
  const backspaces = log.length - chars.length
  const elapsed = Math.max(endTime, 1)
  const minutes = elapsed / 60000

  const charStats: SessionMetrics['charStats'] = {}
  const bigramStats: SessionMetrics['bigramStats'] = {}
  let capitalErrors = 0
  let capitalAttempts = 0
  let symbolErrors = 0
  let symbolAttempts = 0
  let previous: Keystroke | undefined

  for (const key of log) {
    if (key.kind === 'backspace') {
      previous = undefined
      continue
    }
    const expected = key.expected!
    const stat = (charStats[expected] ??= [0, 0])
    stat[0] += 1
    if (!key.correct) stat[1] += 1
    if (isCapital(expected)) {
      capitalAttempts += 1
      if (!key.correct) capitalErrors += 1
    }
    if (isSymbol(expected) && expected !== ' ') {
      symbolAttempts += 1
      if (!key.correct) symbolErrors += 1
    }
    // A bigram is the previous target letter plus this one; only counted for
    // uninterrupted, letter-to-letter runs so transition time is meaningful.
    if (previous && previous.correct && previous.index === key.index - 1 && /[a-z]{2}/i.test(previous.expected! + expected)) {
      const pair = (previous.expected! + expected).toLowerCase()
      const bigram = (bigramStats[pair] ??= [0, 0, 0])
      bigram[0] += 1
      if (!key.correct) bigram[1] += 1
      bigram[2] += key.t - previous.t
    }
    previous = key
  }

  // Correct keystrokes per 5-second window drive burst speed, consistency and the timeline.
  const windows = Math.max(1, Math.ceil(elapsed / WINDOW_MS))
  const perWindow = new Array<number>(windows).fill(0)
  for (const key of chars) if (key.correct) perWindow[Math.min(windows - 1, Math.floor(key.t / WINDOW_MS))] += 1
  const windowWpm = perWindow.map((count, i) => {
    const span = i === windows - 1 ? elapsed - i * WINDOW_MS : WINDOW_MS
    return count / 5 / (Math.max(span, 1000) / 60000)
  })
  const full = windowWpm.length > 1 ? windowWpm.slice(0, -1) : windowWpm
  const mean = full.reduce((a, b) => a + b, 0) / full.length
  const deviation = Math.sqrt(full.reduce((a, b) => a + (b - mean) ** 2, 0) / full.length)
  const consistency = mean ? Math.max(0, Math.round(100 - (deviation / mean) * 100)) : 0

  const half = Math.floor(chars.length / 2)
  const acc = (part: Keystroke[]) => (part.length ? part.filter((k) => k.correct).length / part.length : 1)
  const accuracyDrop = chars.length >= 20 ? Math.round((acc(chars.slice(0, half)) - acc(chars.slice(half))) * 100) : 0

  const third = Math.floor(full.length / 3)
  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1)
  const early = avg(full.slice(0, third))
  const speedDrop = third >= 1 && early ? Math.round(((early - avg(full.slice(-third))) / early) * 100) : 0

  return {
    wpm: Math.round(correctChars / 5 / minutes),
    rawWpm: Math.round(chars.length / 5 / minutes),
    accuracy: chars.length ? Math.round(((chars.length - errors) / chars.length) * 1000) / 10 : 100,
    elapsedSeconds: elapsed / 1000,
    keystrokes: chars.length,
    errors,
    backspaces,
    correctionRate: chars.length ? Math.round((backspaces / chars.length) * 100) / 100 : 0,
    burstWpm: Math.round(Math.max(...windowWpm)),
    consistency,
    accuracyDrop,
    speedDrop,
    charStats,
    bigramStats,
    capitalErrors,
    capitalAttempts,
    symbolErrors,
    symbolAttempts,
    wpmTimeline: windowWpm.map(Math.round),
  }
}

/** Rewards depend on WPM, accuracy and completion time (vision Section 4). */
export function computeXp(metrics: SessionMetrics, repaired: boolean, level: number, timeLeft: number): number {
  if (!repaired) return Math.round(metrics.wpm * 0.5)
  const base = 40 + level * 20
  const speed = metrics.wpm * 1.5
  const precision = Math.max(0, metrics.accuracy - 80) * 3
  const timeBonus = timeLeft * 1.2
  return Math.round(base + speed + precision + timeBonus)
}

/** Stars shown on the report and mission card. */
export function computeStars(metrics: SessionMetrics, repaired: boolean, targetWpm: number): number {
  if (!repaired) return 0
  let stars = 1
  if (metrics.accuracy >= 95) stars += 1
  if (metrics.wpm >= targetWpm && metrics.accuracy >= 90) stars += 1
  return stars
}
