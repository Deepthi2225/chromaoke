// R.O.B.I. coach, stage one (vision Section 5.4): feedback built only from the
// player's real session data. No LLM yet; when one is added it will phrase
// these same facts, and never decide scores (Principle 4).

import { getMission, type MissionId } from '../data/missions'
import { CATEGORY_LABELS, topWeakness, weakBigrams, weakChars, type TypingProfile, type WeaknessCategory } from './analyzer'
import type { SessionRecord } from './storage'
import type { SessionMetrics } from './typing'

/** A practice tip for each weakness, plus the mission that drills it (if any). */
const ADVICE: Record<WeaknessCategory, { tip: string; mission?: MissionId; drill?: string }> = {
  characters: { tip: 'Slow down by about 10% and aim for zero corrections. Speed comes back once the fingers are sure.' },
  combinations: { tip: 'Type long words slowly and evenly.', mission: 'circuit', drill: 'its long words are full of the letter pairs that slow you down' },
  capitals: { tip: 'Use the Shift key on the opposite hand to the letter.', mission: 'code', drill: 'its snippets are full of capitals' },
  symbols: { tip: 'Look at the symbol before you reach for it instead of hunting.', mission: 'code', drill: 'start it at level 1' },
  consistency: { tip: 'Aim for an even rhythm rather than bursts. Say each word in your head as you type it.' },
  endurance: { tip: 'Your accuracy fades late in a passage; take a short break between runs.', mission: 'comms', drill: 'its long broadcasts build stamina' },
}

/** Only point the player at missions they can actually open. */
function advice(weakness: WeaknessCategory, isUnlocked: (id: MissionId) => boolean): string {
  const { tip, mission, drill } = ADVICE[weakness]
  if (!mission) return tip
  const name = getMission(mission).name
  return isUnlocked(mission) ? `${tip} Try ${name}: ${drill}.` : `${tip} ${name} will drill this once you unlock it.`
}

export function sessionNotes(m: SessionMetrics, profile: TypingProfile): string[] {
  const notes: string[] = []
  if (m.accuracy >= 97) notes.push(`Clean work: ${m.accuracy}% accuracy.`)
  else if (m.accuracy < 90) notes.push(`${m.errors} wrong keystrokes pulled accuracy to ${m.accuracy}%.`)
  if (m.burstWpm > m.wpm * 1.4 && m.wpm > 0) notes.push(`You hit ${m.burstWpm} WPM in your fastest 5 seconds, well above your average of ${m.wpm}. Smoothing that out is free speed.`)
  if (m.accuracyDrop >= 6) notes.push(`Accuracy fell ${m.accuracyDrop} points in the second half of the passage.`)
  if (m.speedDrop >= 20) notes.push(`You slowed down by ${m.speedDrop}% towards the end.`)
  if (m.correctionRate > 0.12) notes.push(`You pressed Backspace ${m.backspaces} times. Fixing errors costs more time than typing carefully.`)
  const chars = weakChars(profile, 3)
  if (chars.length) notes.push(`Keys you miss most so far: ${chars.map((c) => `"${c.char}"`).join(', ')}.`)
  const pairs = weakBigrams(profile, 3)
  if (pairs.length) notes.push(`Trickiest letter pairs: ${pairs.map((p) => `"${p.pair}" (${p.ms} ms)`).join(', ')}.`)
  return notes.slice(0, 4)
}

export function recommendation(profile: TypingProfile, history: SessionRecord[], isUnlocked: (id: MissionId) => boolean): { title: string; body: string } {
  if (!history.length) {
    return { title: 'Welcome, technician', body: 'Start with Battery Recovery. After your first repair I will build your typing profile and tailor every mission to it.' }
  }
  const weakness = topWeakness(profile)
  const recent = history.slice(-5)
  const avgWpm = Math.round(recent.reduce((s, r) => s + r.wpm, 0) / recent.length)
  const avgAcc = Math.round(recent.reduce((s, r) => s + r.accuracy, 0) / recent.length)
  if (!weakness) {
    return { title: 'Systems nominal', body: `Last ${recent.length} repair${recent.length === 1 ? '' : 's'}: ${avgWpm} WPM at ${avgAcc}% accuracy. No clear weak spot, so push a harder level.` }
  }
  return { title: `Focus: ${CATEGORY_LABELS[weakness].toLowerCase()}`, body: `Last ${recent.length} repair${recent.length === 1 ? '' : 's'}: ${avgWpm} WPM at ${avgAcc}% accuracy. ${advice(weakness, isUnlocked)}` }
}
