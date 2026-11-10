// Mission catalogue from the vision document (Section 4). Each mission trains a
// different typing skill and has three levels. Passages are original text.
// The data lives in missions.json so the FastAPI backend validates sessions
// against exactly the same catalogue.

import catalogue from './missions.json'

export type MissionId = 'battery' | 'circuit' | 'code' | 'comms' | 'shutdown'

export interface Level {
  level: number
  /** WPM the player should reach before the engine promotes them. */
  targetWpm: number
  timeLimit: number
  passages: string[]
}

export interface Mission {
  id: MissionId
  number: number
  name: string
  tier: string
  focus: string
  robot: { name: string; role: string; hue: number }
  malfunction: string
  diagnosis: string[]
  levels: Level[]
}

export const MISSIONS = catalogue as Mission[]

export const getMission = (id: MissionId) => MISSIONS.find((mission) => mission.id === id)!
