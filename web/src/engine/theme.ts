// The page rests in black and grey. When a song starts, its album art colours the page:
// up to three colours come from the cover, and fixed rules keep every palette dark and readable.

import { useEffect, useState } from 'react'
import { api } from './api'

interface Seed {
  /** Hue in degrees. */
  h: number
  /** How colourful that part of the artwork is, 0 to 1. */
  s: number
}

const SAMPLE_SIZE = 24
const HUE_BUCKETS = 12
const MAX_SATURATION = 0.65
const GREY_ARTWORK = 0.04
/** A second or third colour must cover at least this share of the main one, and sit this many buckets (30 degrees each) away. */
const MIN_SHARE = 0.12
const MIN_BUCKET_GAP = 2

/** The cover's main colours, most dominant first. One to three seeds. */
function extractSeeds(url: string): Promise<Seed[] | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onerror = () => resolve(null)
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = SAMPLE_SIZE
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
        const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

        // Vote by hue, weighted by how vivid each pixel is, so greys and near-blacks don't decide.
        const buckets = Array.from({ length: HUE_BUCKETS }, (_, index) => ({ index, weight: 0, x: 0, y: 0, saturation: 0 }))
        let total = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const chroma = max - min
          if (chroma < 0.05) continue
          const lightness = (max + min) / 2
          const saturation = chroma / (1 - Math.abs(2 * lightness - 1) || 1)
          let hue = max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4
          hue = (hue * 60 + 360) % 360
          const bucket = buckets[Math.floor(hue / (360 / HUE_BUCKETS)) % HUE_BUCKETS]
          const angle = (hue * Math.PI) / 180
          bucket.weight += chroma
          bucket.x += Math.cos(angle) * chroma
          bucket.y += Math.sin(angle) * chroma
          bucket.saturation += saturation * chroma
          total += chroma
        }
        if (total / (SAMPLE_SIZE * SAMPLE_SIZE) < GREY_ARTWORK) return resolve([{ h: 30, s: 0.05 }])

        const ranked = buckets.sort((a, b) => b.weight - a.weight)
        const gap = (a: number, b: number) => Math.min(Math.abs(a - b), HUE_BUCKETS - Math.abs(a - b))
        const picked = [ranked[0]]
        for (const bucket of ranked.slice(1)) {
          if (picked.length === 3 || bucket.weight < ranked[0].weight * MIN_SHARE) break
          if (picked.every((other) => gap(other.index, bucket.index) >= MIN_BUCKET_GAP)) picked.push(bucket)
        }
        resolve(picked.map((b) => ({ h: ((Math.atan2(b.y, b.x) * 180) / Math.PI + 360) % 360, s: b.saturation / b.weight })))
      } catch {
        resolve(null)
      }
    }
    image.src = url
  })
}

/** Songs without artwork still get their own, repeatable colour. */
const fallbackSeeds = (songId: number): Seed[] => [{ h: (songId * 137.5) % 360, s: 0.4 }]

function buildPalette(seeds: Seed[]): Record<string, string> {
  // Covers with one or two colours get neighbouring hues for the rest, so there is always a full palette.
  const main = seeds[0]
  const second = seeds[1] ?? { h: (main.h + 40) % 360, s: main.s }
  const third = seeds[2] ?? { h: (main.h + 310) % 360, s: main.s }
  const tone = ({ h, s }: Seed, saturation: number, lightness: number) => {
    const tint = Math.min(Math.max(s, 0.08), MAX_SATURATION) / MAX_SATURATION
    return `hsl(${h.toFixed(0)} ${(saturation * tint).toFixed(0)}% ${lightness.toFixed(0)}%)`
  }
  // Yellows and greens look brighter than blues at the same lightness; even that out.
  const bright = ({ h }: Seed) => 64 + 7 * Math.cos(((h - 250) * Math.PI) / 180)
  return {
    // The cover's main colour sets the room: backgrounds, borders and the tint of the text.
    '--bg': tone(main, 34, 7),
    '--bg-raised': tone(main, 30, 11),
    '--bg-hover': tone(main, 26, 15),
    '--line': tone(main, 22, 22),
    '--ink': tone(main, 22, 92),
    '--ink-2': tone(main, 14, 70),
    '--ink-3': tone(main, 12, 47),
    '--glow': tone(main, 70, 45),
    // Its second colour is for what you act on: buttons, the caret, progress.
    '--accent': tone(second, 64, bright(second)),
    '--accent-ink': tone(main, 34, 7),
    '--glow-2': tone(second, 70, 45),
    // Its third marks the line being sung.
    '--sung': tone(third, 58, bright(third) + 4),
    '--glow-3': tone(third, 70, 45),
  }
}

const TOKENS = Object.keys(buildPalette([{ h: 0, s: 0 }]))

function applyPalette(palette: Record<string, string> | null) {
  const style = document.documentElement.style
  for (const token of TOKENS) {
    if (palette) style.setProperty(token, palette[token])
    else style.removeProperty(token)
  }
}

/** Finds the song's artwork and palette; the palette is only applied while `inColour`. Returns the artwork URL and the applied palette. */
export function useSongTheme(songId: number | null, inColour: boolean): { artUrl: string | null; palette: Record<string, string> | null } {
  const [theme, setTheme] = useState<{ songId: number; url: string | null; palette: Record<string, string> } | null>(null)

  useEffect(() => {
    if (songId === null) return
    let cancelled = false
    const themeFrom = async (url: string | null) => {
      const seeds = (url && (await extractSeeds(url))) || fallbackSeeds(songId)
      if (!cancelled) setTheme({ songId, url, palette: buildPalette(seeds) })
    }
    api.getArt(songId).then(({ url }) => themeFrom(url)).catch(() => themeFrom(null))
    return () => { cancelled = true }
  }, [songId])

  const current = theme && theme.songId === songId ? theme : null
  const palette = inColour ? current?.palette ?? null : null
  useEffect(() => applyPalette(palette), [palette])

  return { artUrl: current?.url ?? null, palette }
}
