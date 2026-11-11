import type { ResultRecord } from './storage'

const DAY_MS = 86_400_000

/** A number for the calendar day in the typist's own time zone. */
const dayOf = (at: number) => {
  const date = new Date(at)
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

/** Days in a row with at least one finished song. Yesterday keeps a streak alive until today ends. */
export function streakDays(history: ResultRecord[], now = Date.now()): number {
  const practised = new Set(history.map((record) => dayOf(record.at)))
  let day = dayOf(now)
  if (!practised.has(day)) day -= 1
  let streak = 0
  while (practised.has(day)) {
    streak += 1
    day -= 1
  }
  return streak
}
