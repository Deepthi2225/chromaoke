// Shared types and helpers for the repair scenes.

export type BenchMode = 'idle' | 'scan' | 'weld' | 'demo' | 'celebrate' | 'fail'

/** Prefixes SVG ids so several scenes can live on one page. */
export type Id = (name: string) => string

export type Point = { x: number; y: number }

/** Two-segment inverse kinematics. Of the two elbow solutions, keep the lower one, or the one on a given side. */
export function solveElbow(shoulder: Point, hand: Point, upper: number, fore: number, prefer: 'low' | 'left' | 'right' = 'low'): Point {
  const dx = hand.x - shoulder.x
  const dy = hand.y - shoulder.y
  const d = Math.max(0.01, Math.min(Math.hypot(dx, dy), upper + fore - 0.01))
  const a = (upper * upper - fore * fore + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, upper * upper - a * a))
  const ux = dx / d
  const uy = dy / d
  const mx = shoulder.x + ux * a
  const my = shoulder.y + uy * a
  const p1 = { x: mx - uy * h, y: my + ux * h }
  const p2 = { x: mx + uy * h, y: my - ux * h }
  if (prefer === 'left') return p1.x <= p2.x ? p1 : p2
  if (prefer === 'right') return p1.x >= p2.x ? p1 : p2
  return p1.y >= p2.y ? p1 : p2
}
