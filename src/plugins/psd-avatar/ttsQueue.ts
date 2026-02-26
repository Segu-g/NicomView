import { synthesize } from './voicevoxClient'
import { LipSync } from './lipSync'

const MAX_QUEUE_SIZE = 30

export interface TtsQueueOptions {
  host: string
  speaker: number
  speed: number
  volume: number
  threshold: number
  sensitivity: number
  onLipLevel: (level: number) => void
  onSpeakStart?: () => void
  onSpeakEnd?: () => void
}

export class TtsQueue {
  private queue: string[] = []
  private processing = false
  private opts: TtsQueueOptions
  private audioContext: AudioContext | null = null
  private currentLipSync: LipSync | null = null

  constructor(opts: TtsQueueOptions) {
    this.opts = opts
  }

  updateOptions(opts: Partial<TtsQueueOptions>): void {
    Object.assign(this.opts, opts)
  }

  enqueue(text: string): void {
    if (this.queue.length >= MAX_QUEUE_SIZE) return
    this.queue.push(text)
    this.processNext()
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    const text = this.queue.shift()!
    try {
      const wavBuffer = await synthesize(
        text,
        this.opts.speaker,
        this.opts.speed,
        this.opts.volume,
        this.opts.host
      )
      await this.play(wavBuffer)
    } catch (e) {
      console.error('[psd-avatar] TTS error:', e)
    }

    this.processing = false
    this.processNext()
  }

  private async play(wavBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    const ctx = this.audioContext
    const audioBuffer = await ctx.decodeAudioData(wavBuffer)
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer

    const gainNode = ctx.createGain()
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    const lipSync = new LipSync(ctx, gainNode, {
      threshold: this.opts.threshold,
      sensitivity: this.opts.sensitivity,
    })
    this.currentLipSync = lipSync

    return new Promise<void>((resolve) => {
      lipSync.start()
      this.opts.onSpeakStart?.()

      const poll = (): void => {
        this.opts.onLipLevel(lipSync.level)
        if (this.currentLipSync === lipSync) {
          requestAnimationFrame(poll)
        }
      }
      requestAnimationFrame(poll)

      source.onended = (): void => {
        lipSync.destroy()
        this.currentLipSync = null
        this.opts.onLipLevel(0)
        this.opts.onSpeakEnd?.()
        resolve()
      }
      source.start()
    })
  }

  destroy(): void {
    this.queue = []
    this.currentLipSync?.destroy()
    this.currentLipSync = null
    this.audioContext?.close()
    this.audioContext = null
  }
}
