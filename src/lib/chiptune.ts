// Mockup audio: a tiny chiptune generated in the browser, one melody per song.
// No audio files and nothing copyrighted. Replaced by real playback when Spotify is connected.

const SCALES = [
  [0, 2, 4, 7, 9], // major pentatonic
  [0, 3, 5, 7, 10], // minor pentatonic
  [0, 2, 3, 7, 8], // hirajoshi-ish
  [0, 2, 4, 5, 7, 9, 11], // major
]

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Song = {
  bpm: number
  root: number
  lead: (number | null)[]
  bass: number[]
  wave: OscillatorType
}

function compose(id: string): Song {
  const r = rng(hash(id))
  const scale = SCALES[Math.floor(r() * SCALES.length)]
  const root = 57 + Math.floor(r() * 7) // around A3..D#4
  const bpm = 92 + Math.floor(r() * 50)
  const motif = Array.from({ length: 8 }, () =>
    r() < 0.2
      ? null
      : scale[Math.floor(r() * scale.length)] + (r() < 0.25 ? 12 : 0),
  )
  // A A' B A: repeat the hook (it's an app about repeats)
  const variant = motif.map((n, i) => (i > 5 && n !== null ? n + scale[1] : n))
  const lead = [
    ...motif,
    ...variant,
    ...motif.map((n) => (n === null ? null : n + 5)),
    ...motif,
  ]
  const prog = [0, 5, 3, 4].map((d) => scale[d % scale.length] - 12)
  const bass = prog.flatMap((n) => Array(8).fill(n))
  return { bpm, root, lead, bass, wave: r() < 0.5 ? 'square' : 'triangle' }
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

class Chiptune {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: number | null = null
  private song: Song | null = null
  private step = 0
  private nextTime = 0
  private songId = ''
  private volume = 0.08

  private ensure() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  private note(
    freq: number,
    at: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(gain, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(g).connect(this.master!)
    osc.start(at)
    osc.stop(at + dur + 0.02)
  }

  private tick = () => {
    const ctx = this.ctx
    const song = this.song
    if (!ctx || !song) return
    const sixteenth = 60 / song.bpm / 2
    while (this.nextTime < ctx.currentTime + 0.12) {
      const i = this.step % song.lead.length
      const n = song.lead[i]
      if (n !== null)
        this.note(
          midi(song.root + n),
          this.nextTime,
          sixteenth * 0.9,
          song.wave,
          0.5,
        )
      if (i % 2 === 0)
        this.note(
          midi(song.root + song.bass[i % song.bass.length]),
          this.nextTime,
          sixteenth * 1.8,
          'triangle',
          0.7,
        )
      if (i % 4 === 2) this.note(2400, this.nextTime, 0.03, 'square', 0.12) // hat
      this.nextTime += sixteenth
      this.step++
    }
  }

  // Safari only lets audio start inside a click or key press, and React effects run after it.
  // So the first gesture anywhere on the page creates and starts the audio context.
  unlock = () => {
    const ctx = this.ensure()
    if (ctx.state !== 'running') void ctx.resume()
    const silent = ctx.createBufferSource()
    silent.buffer = ctx.createBuffer(1, 1, 22050)
    silent.connect(ctx.destination)
    silent.start(0)
  }

  play(id: string) {
    const ctx = this.ensure()
    if (ctx.state !== 'running') void ctx.resume()
    if (id !== this.songId) {
      this.song = compose(id)
      this.songId = id
      this.step = 0
    }
    this.nextTime = ctx.currentTime + 0.05
    if (this.timer === null) this.timer = window.setInterval(this.tick, 25)
  }

  pause() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  setMuted(muted: boolean) {
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02,
      )
    this.volume = muted ? 0 : 0.08
  }
}

export const chiptune = new Chiptune()
