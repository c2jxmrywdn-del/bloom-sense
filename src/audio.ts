// A tiny generative soundscape: warm drone + air + glass chimes.
// No audio files, everything synthesized locally.

type EnvTone = { root: number; fifth: number; cutoff: number; air: number }

const ENV_TONES: Record<string, EnvTone> = {
  bamboo: { root: 123.47, fifth: 185, cutoff: 780, air: 0.18 },
  moon: { root: 98, fifth: 146.83, cutoff: 520, air: 0.12 },
  cosmic: { root: 87.31, fifth: 130.81, cutoff: 700, air: 0.08 },
  dawn: { root: 110, fifth: 164.81, cutoff: 900, air: 0.16 },
  amber: { root: 130.81, fifth: 196, cutoff: 640, air: 0.11 },
  aurora: { root: 92.5, fifth: 138.59, cutoff: 620, air: 0.1 },
}

class BloomAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambient: GainNode | null = null
  private drones: OscillatorNode[] = []
  private droneGains: GainNode[] = []
  private filter: BiquadFilterNode | null = null
  private noise: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null
  private enabled = false
  private env = 'moon'

  async init() {
    if (this.ctx) {
      await this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return
    const ctx: AudioContext = new Ctor()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.0001
    this.master.connect(ctx.destination)

    this.ambient = ctx.createGain()
    this.ambient.gain.value = 0.2
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 520
    this.filter.Q.value = 0.4
    this.ambient.connect(this.filter).connect(this.master)

    const tone = ENV_TONES[this.env]
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.value = [tone.root, tone.fifth, tone.root * 2][i]
      osc.detune.value = [-7, 4, 9][i]
      gain.gain.value = [0.16, 0.07, 0.028][i]
      osc.connect(gain).connect(this.ambient)
      osc.start()
      this.drones.push(osc)
      this.droneGains.push(gain)
      // very slow breathing
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.035 + i * 0.017
      lfoGain.gain.value = 0.035
      lfo.connect(lfoGain).connect(gain.gain)
      lfo.start()
    }

    // airy noise bed
    const len = ctx.sampleRate * 3
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1100
    bp.Q.value = 0.8
    const ng = ctx.createGain()
    ng.gain.value = 0.018
    noise.connect(bp).connect(ng).connect(this.master)
    noise.start()
    this.noise = noise
    this.noiseGain = ng
  }

  async enable(on: boolean) {
    this.enabled = on
    if (!this.ctx) await this.init()
    if (!this.ctx || !this.master) return
    const target = on ? 0.5 : 0.0001
    this.master.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.8)
    if (on) await this.ctx.resume()
  }

  setEnvironment(id: string) {
    this.env = id
    if (!this.ctx || !this.filter) return
    const tone = ENV_TONES[id] ?? ENV_TONES.moon
    const t = this.ctx.currentTime
    this.filter.frequency.cancelScheduledValues(t)
    this.filter.frequency.linearRampToValueAtTime(tone.cutoff, t + 1.6)
    this.drones.forEach((osc, i) => {
      const target = [tone.root, tone.fifth, tone.root * 2][i]
      osc.frequency.cancelScheduledValues(t)
      osc.frequency.linearRampToValueAtTime(target, t + 2.4)
    })
    if (this.noiseGain) {
      this.noiseGain.gain.cancelScheduledValues(t)
      this.noiseGain.gain.linearRampToValueAtTime(tone.air * 0.08, t + 1.2)
    }
  }

  private now() {
    return this.ctx?.currentTime ?? 0
  }

  private pluck(freq: number, delay: number, gain = 0.035, type: OscillatorType = 'sine', dur = 1.8) {
    if (!this.ctx || !this.master || !this.enabled) return
    const t = this.now() + delay
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(lp).connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.1)
  }

  bloom() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5]
    notes.forEach((n, i) => this.pluck(n, i * 0.055, 0.024, 'sine', 2.6))
  }

  close() {
    this.pluck(329.63, 0, 0.02, 'sine', 1.6)
    this.pluck(246.94, 0.06, 0.018, 'triangle', 2)
  }

  flowerSwitch() {
    const notes = [523.25, 659.25, 880, 1174.66]
    notes.forEach((n, i) => this.pluck(n, i * 0.07, 0.018, i === 3 ? 'sine' : 'triangle', 2.2))
  }

  environmentSwitch() {
    if (!this.ctx || !this.master || !this.enabled) return
    const t = this.now()
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130.81, t)
    osc.frequency.exponentialRampToValueAtTime(65.4, t + 2.6)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.25)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + 3.3)
    this.pluck(783.99, 0.35, 0.012, 'sine', 3.2)
    this.pluck(587.33, 0.55, 0.008, 'sine', 3.6)
  }

  chime() {
    this.pluck(1046.5, 0, 0.008, 'sine', 1.2)
  }
}

export const audio = new BloomAudio()
