export class LipSync {
  private analyser: AnalyserNode
  private dataArray: Uint8Array
  private history: number[]
  private sensitivity: number
  private threshold: number
  private animId: number | null = null
  private _level = 0

  constructor(
    audioContext: AudioContext,
    source: AudioNode,
    opts: { threshold?: number; sensitivity?: number } = {}
  ) {
    this.threshold = opts.threshold ?? 0.15
    this.sensitivity = opts.sensitivity ?? 3

    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = 256
    source.connect(this.analyser)

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.history = []
  }

  get level(): number {
    return this._level
  }

  start(): void {
    if (this.animId !== null) return
    const update = (): void => {
      this.analyser.getByteTimeDomainData(this.dataArray)

      let sum = 0
      for (let i = 0; i < this.dataArray.length; i++) {
        const v = (this.dataArray[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / this.dataArray.length)

      this.history.push(rms)
      if (this.history.length > this.sensitivity) {
        this.history.shift()
      }

      const avg = this.history.reduce((a, b) => a + b, 0) / this.history.length
      this._level = amplitudeToLevel(avg, this.threshold)

      this.animId = requestAnimationFrame(update)
    }
    this.animId = requestAnimationFrame(update)
  }

  stop(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId)
      this.animId = null
    }
    this._level = 0
    this.history = []
  }

  destroy(): void {
    this.stop()
    this.analyser.disconnect()
  }
}

function amplitudeToLevel(amp: number, threshold: number): number {
  if (amp < threshold) return 0
  if (amp < 0.3) return 1
  if (amp < 0.5) return 2
  if (amp < 0.7) return 3
  return 4
}
