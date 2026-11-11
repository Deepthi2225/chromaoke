import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

export interface PlayerHandle {
  play(): void
  pause(): void
  seekBy(seconds: number): void
  seekTo(seconds: number): void
  currentTime(): number
}

interface Props {
  ref: Ref<PlayerHandle>
  src: string
  onReady: () => void
  onPlaying: () => void
  onPaused: () => void
  onEnded: () => void
  onFailed: () => void
}

/** Plays the stream with no visible element; the typing screen draws its own progress. */
export function AudioPlayer({ ref, src, onReady, onPlaying, onPaused, onEnded, onFailed }: Props) {
  const audio = useRef<HTMLAudioElement>(null)

  useImperativeHandle(ref, () => ({
    play: () => { audio.current?.play().catch(() => undefined) },
    pause: () => audio.current?.pause(),
    seekBy: (seconds) => {
      if (audio.current) audio.current.currentTime = Math.max(0, audio.current.currentTime + seconds)
    },
    seekTo: (seconds) => {
      if (audio.current) audio.current.currentTime = Math.max(0, seconds)
    },
    currentTime: () => audio.current?.currentTime ?? 0,
  }), [])

  // Feeds the bass level to the page's glow. Louder-than-usual moments pulse; a steady loud song does not.
  useEffect(() => {
    const element = audio.current
    const glow = document.querySelector<HTMLElement>('.atmosphere')
    if (!element || !glow || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let context: AudioContext | null = null
    let frame = 0
    const start = () => {
      if (context) return void context.resume().catch(() => undefined)
      try {
        context = new AudioContext()
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        context.createMediaElementSource(element).connect(analyser)
        analyser.connect(context.destination)
        const bins = new Uint8Array(analyser.frequencyBinCount)
        let average = 0
        let pulse = 0
        const tick = () => {
          analyser.getByteFrequencyData(bins)
          const bass = (bins[0] + bins[1] + bins[2]) / 3 / 255
          average += (bass - average) * 0.02
          const hit = Math.min(1, Math.max(0, (bass - average) * 4))
          pulse += (hit - pulse) * (hit > pulse ? 0.5 : 0.08)
          glow.style.setProperty('--bass', pulse.toFixed(3))
          frame = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        context = null
      }
    }
    element.addEventListener('play', start)
    return () => {
      element.removeEventListener('play', start)
      cancelAnimationFrame(frame)
      context?.close().catch(() => undefined)
      glow.style.removeProperty('--bass')
    }
  }, [])

  return <audio ref={audio} src={src} crossOrigin="anonymous" preload="auto" onCanPlay={onReady} onPlaying={onPlaying} onPause={onPaused} onEnded={onEnded} onError={onFailed} />
}
