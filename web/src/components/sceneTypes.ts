// Shared types for the workbench scene and its environments and parts.
import type { MissionId } from '../data/missions'

export type BenchMode = 'idle' | 'scan' | 'weld' | 'demo' | 'celebrate' | 'fail'

/** Prefixes SVG ids so several scenes can live on one page. */
export type Id = (name: string) => string

/** Where a repair happens. The Workshop is home; each mission has its own location. */
export type Env = 'workshop' | 'vault' | 'cleanroom' | 'mainframe' | 'rooftop' | 'reactor'

export type MissionEnv = Exclude<Env, 'workshop'>

export const MISSION_ENV: Record<MissionId, MissionEnv> = {
  battery: 'vault',
  circuit: 'cleanroom',
  code: 'mainframe',
  comms: 'rooftop',
  shutdown: 'reactor',
}

/** Colour wash (soft-light) and vignette tint per location. */
export const ENV_GRADE: Record<MissionEnv, { grade: string; strength: number; vignette: string }> = {
  vault: { grade: '#3BE39A', strength: 0.28, vignette: '#030A07' },
  cleanroom: { grade: '#CFE3FF', strength: 0.3, vignette: '#1C2740' },
  mainframe: { grade: '#1FA9FF', strength: 0.26, vignette: '#02040B' },
  rooftop: { grade: '#FF4FB8', strength: 0.24, vignette: '#07030F' },
  reactor: { grade: '#FF3B3B', strength: 0.34, vignette: '#0C0204' },
}
