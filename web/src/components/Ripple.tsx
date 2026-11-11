import { useEffect, useRef } from 'react'

interface Props {
  /** Changes once per song start; null for no ripple. */
  trigger: string | null
  /** The palette's colours, painted outward one ring after another. */
  colours: string[]
}

const RING_MS = 2400
const STAGGER_MS = 280

/**
 * When a song starts, its colours ripple out from the album cover in rings, one per palette colour,
 * and wash across the page. Drawn behind the content; skipped when the system asks for reduced motion.
 */
export function Ripple({ trigger, colours }: Props) {
  const layer = useRef<HTMLDivElement>(null)
  const palette = colours.join('|')

  useEffect(() => {
    const host = layer.current
    if (!trigger || !host || !palette || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const anchor = document.querySelector('.art.small') ?? document.querySelector('.lyrics-frame')
    const box = anchor?.getBoundingClientRect()
    const x = box ? box.left + box.width / 2 : window.innerWidth / 2
    const y = box ? box.top + box.height / 2 : window.innerHeight / 3
    // Big enough to reach the farthest corner of the window.
    const size = 2 * Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const rings = palette.split('|').map((colour, index) => {
      const ring = document.createElement('i')
      ring.className = 'ripple-ring'
      Object.assign(ring.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        // A soft wash inside, with a brighter crest at the leading edge, like paint spreading.
        background: `radial-gradient(closest-side, color-mix(in srgb, ${colour} 14%, transparent) 0 45%, color-mix(in srgb, ${colour} 38%, transparent) 78%, color-mix(in srgb, ${colour} 80%, transparent) 92%, transparent 100%)`,
      })
      host.append(ring)
      const animation = ring.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
          { transform: 'translate(-50%, -50%) scale(0.8)', opacity: 0.95, offset: 0.7 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
        ],
        { duration: RING_MS, delay: index * STAGGER_MS, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)', fill: 'both' },
      )
      animation.onfinish = () => ring.remove()
      return ring
    })
    return () => rings.forEach((ring) => ring.remove())
  }, [palette, trigger])

  return <div className="ripple" ref={layer} aria-hidden />
}
