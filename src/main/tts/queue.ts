import type { TtsAdapter } from './types'

const MAX_QUEUE_SIZE = 30

export class TtsQueue {
  private queue: string[] = []
  private processing = false
  private adapter: TtsAdapter | null = null
  private speed = 1
  private volume = 1

  setAdapter(adapter: TtsAdapter | null): void {
    this.adapter = adapter
  }

  setParams(speed: number, volume: number): void {
    this.speed = speed
    this.volume = volume
  }

  enqueue(text: string): void {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift()
    }
    this.queue.push(text)
    this.processNext()
  }

  clear(): void {
    this.queue = []
  }

  private async processNext(): Promise<void> {
    if (this.processing || !this.adapter) return

    const text = this.queue.shift()
    if (!text) return

    this.processing = true
    try {
      await this.adapter.speak(text, this.speed, this.volume)
    } catch (err) {
      console.error('[TTS] speak error:', err)
    } finally {
      this.processing = false
      this.processNext()
    }
  }
}
