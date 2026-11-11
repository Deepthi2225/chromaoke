// Painted background art for each mission, picked up automatically from
// src/assets/scenes/<mission>.(webp|jpg|jpeg|png). Missions without a file keep
// their SVG backdrop. See src/assets/scenes/README.md.

import type { MissionId } from '../data/missions'

const files = import.meta.glob('../assets/scenes/*.{webp,jpg,jpeg,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export const PAINTED: Partial<Record<MissionId, string>> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.[^.]+$/, ''), url]),
)
