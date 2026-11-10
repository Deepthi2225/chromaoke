// Small synthesized sound effects (no audio files to license).
let ctx: AudioContext | null = null

function tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
  try {
    ctx ??= new AudioContext()
    const start = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + duration)
  } catch {
    // Audio is optional.
  }
}

export const sfx = {
  key: () => tone(1400 + Math.random() * 200, 0.025, 'square', 0.012),
  error: () => {
    tone(140, 0.12, 'sawtooth', 0.05)
    tone(95, 0.12, 'square', 0.03, 0.03)
  },
  repaired: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.09)),
  failed: () => [330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.04, i * 0.12)),
  levelUp: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'sine', 0.06, i * 0.07)),
  /** Soft mechanical clack when a mission cartridge lifts out of its slot. */
  hover: () => {
    tone(220, 0.035, 'square', 0.025)
    tone(1300, 0.02, 'triangle', 0.02, 0.025)
  },
}
