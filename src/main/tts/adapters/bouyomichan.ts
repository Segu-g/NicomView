import type { TtsAdapterParamDef } from '../../../shared/types'
import type { TtsAdapter } from '../types'

export class BouyomichanAdapter implements TtsAdapter {
  readonly id = 'bouyomichan'
  readonly name = '棒読みちゃん'
  readonly defaultSettings = { host: 'localhost', port: 50080, voice: 0, tone: -1 }

  private host: string
  private port: number
  private voice: number
  private tone: number

  constructor(settings?: Record<string, string | number | boolean>) {
    this.host = String(settings?.host ?? this.defaultSettings.host)
    this.port = Number(settings?.port ?? this.defaultSettings.port)
    this.voice = Number(settings?.voice ?? this.defaultSettings.voice)
    this.tone = Number(settings?.tone ?? this.defaultSettings.tone)
  }

  updateSettings(settings: Record<string, string | number | boolean>): void {
    if (settings.host !== undefined) {
      const h = String(settings.host)
      // スキームやパス区切り文字を含むホストを拒否（SSRF 対策）
      if (/[/:?# ]/.test(h)) {
        console.warn('[棒読みちゃん] 不正なホスト名を拒否:', h)
      } else {
        this.host = h
      }
    }
    if (settings.port !== undefined) this.port = Number(settings.port)
    if (settings.voice !== undefined) this.voice = Number(settings.voice)
    if (settings.tone !== undefined) this.tone = Number(settings.tone)
  }

  async getParamDefs(): Promise<TtsAdapterParamDef[]> {
    return [
      {
        key: 'host',
        label: 'ホスト',
        type: 'string',
        defaultValue: 'localhost'
      },
      {
        key: 'port',
        label: 'ポート',
        type: 'number',
        defaultValue: 50080,
        min: 1,
        max: 65535,
        step: 1
      },
      {
        key: 'voice',
        label: '声質',
        type: 'select',
        defaultValue: 0,
        options: [
          { value: 0, label: 'デフォルト' },
          { value: 1, label: '女性1' },
          { value: 2, label: '女性2' },
          { value: 3, label: '男性1' },
          { value: 4, label: '男性2' },
          { value: 5, label: '中性' },
          { value: 6, label: 'ロボット' },
          { value: 7, label: '機械1' },
          { value: 8, label: '機械2' }
        ]
      },
      {
        key: 'tone',
        label: '声の高さ',
        type: 'number',
        defaultValue: -1,
        min: -1,
        max: 200,
        step: 1
      }
    ]
  }

  async speak(text: string, speed: number, volume: number, speakerOverride?: number | string): Promise<void> {
    const voice = speakerOverride !== undefined ? Number(speakerOverride) : this.voice
    const bouyomiSpeed = Math.round(speed * 100)
    const bouyomiVolume = Math.round(volume * 50)

    const url = new URL(`http://${this.host}:${this.port}/Talk`)
    url.searchParams.set('text', text)
    url.searchParams.set('voice', String(voice))
    url.searchParams.set('speed', String(bouyomiSpeed))
    url.searchParams.set('volume', String(bouyomiVolume))
    url.searchParams.set('tone', String(this.tone))

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`BouyomiChan Talk failed: ${res.status}`)
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`http://${this.host}:${this.port}/Talk?text=`)
      return res.ok
    } catch {
      return false
    }
  }

  dispose(): void {
    // No resources to clean up
  }
}
