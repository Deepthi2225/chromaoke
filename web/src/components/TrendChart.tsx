import { useState } from 'react'

interface TrendChartProps {
  values: number[]
  labels: string[]
  unit: string
  color: string
  title: string
  height?: number
  min?: number
  max?: number
}

/** Single-series line chart with a hover tooltip. One axis, recessive grid. */
export function TrendChart({ values, labels, unit, color, title, height = 160, min, max }: TrendChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 520
  const pad = { l: 34, r: 12, t: 12, b: 22 }
  if (!values.length) return <div className="chart-empty">Nothing to chart yet.</div>

  const lo = min ?? Math.max(0, Math.floor(Math.min(...values) * 0.85))
  const hi = Math.max(lo + 1, Math.min(max ?? Infinity, Math.ceil(Math.max(...values) * 1.08)))
  const x = (i: number) => pad.l + (values.length === 1 ? (width - pad.l - pad.r) / 2 : (i / (values.length - 1)) * (width - pad.l - pad.r))
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b)
  const ticks = [lo, Math.round((lo + hi) / 2), hi]
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <figure className="trend-chart">
      <figcaption>{title}</figcaption>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${values.join(', ')} ${unit}`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={pad.l - 6} y={y(t) + 3} className="chart-tick" textAnchor="end">{t}</text>
            </g>
          ))}
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} className="chart-crosshair" />}
          {values.map((v, i) => (
            <g key={i}>
              {(i === values.length - 1 || i === hover) && <circle cx={x(i)} cy={y(v)} r="4.5" fill={color} stroke="var(--bg)" strokeWidth="2" />}
              <rect
                x={x(i) - (width - pad.l - pad.r) / Math.max(values.length, 1) / 2}
                y={0}
                width={(width - pad.l - pad.r) / Math.max(values.length, 1)}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}
          <text x={pad.l} y={height - 5} className="chart-tick">{labels[0]}</text>
          <text x={width - pad.r} y={height - 5} className="chart-tick" textAnchor="end">{labels[labels.length - 1]}</text>
        </svg>
        {hover !== null && (
          <div className="chart-tooltip" style={{ left: `${(x(hover) / width) * 100}%` }}>
            <strong>{values[hover]} {unit}</strong>
            <span>{labels[hover]}</span>
          </div>
        )}
      </div>
    </figure>
  )
}
