import fs from 'fs'
import path from 'path'
import type { CommentEventType, TtsSettings, TtsAdapterInfo } from '../../shared/types'
import { ALL_EVENT_TYPES } from '../../shared/types'
import type { TtsAdapter } from './types'
import { TtsQueue } from './queue'
import { formatTtsText } from './formatter'

const SETTINGS_FILE = 'tts-settings.json'

function isValidEventType(t: unknown): t is CommentEventType {
  return typeof t === 'string' && ALL_EVENT_TYPES.includes(t as CommentEventType)
}

export class TtsManager {
  private adapters: Map<string, TtsAdapter> = new Map()
  private settings: TtsSettings
  private settingsPath: string
  private queue: TtsQueue

  constructor(userDataDir: string) {
    this.settingsPath = path.join(userDataDir, SETTINGS_FILE)
    this.settings = this.loadSettings()
    this.queue = new TtsQueue()
    this.queue.setParams(this.settings.speed, this.settings.volume)
  }

  registerAdapter(adapter: TtsAdapter): void {
    this.adapters.set(adapter.id, adapter)
    if (this.settings.adapterId === adapter.id) {
      this.queue.setAdapter(adapter)
    }
  }

  handleEvent(eventType: CommentEventType, data: unknown): void {
    if (!this.settings.enabled) return
    if (!this.settings.enabledEvents.includes(eventType)) return
    if (!this.queue) return

    const text = formatTtsText(eventType, data)
    if (!text) return

    this.queue.enqueue(text)
  }

  getSettings(): TtsSettings {
    return { ...this.settings }
  }

  setSettings(partial: Partial<TtsSettings>): void {
    if (partial.enabled !== undefined) {
      this.settings.enabled = partial.enabled
    }
    if (partial.adapterId !== undefined) {
      this.settings.adapterId = partial.adapterId
      const adapter = this.adapters.get(partial.adapterId) ?? null
      this.queue.setAdapter(adapter)
    }
    if (partial.enabledEvents !== undefined) {
      this.settings.enabledEvents = partial.enabledEvents.filter(isValidEventType)
    }
    if (partial.speed !== undefined) {
      this.settings.speed = partial.speed
    }
    if (partial.volume !== undefined) {
      this.settings.volume = partial.volume
    }
    if (partial.adapterSettings !== undefined) {
      this.settings.adapterSettings = { ...partial.adapterSettings }
    }

    this.queue.setParams(this.settings.speed, this.settings.volume)
    this.saveSettings()
  }

  getAdapterInfos(): TtsAdapterInfo[] {
    return Array.from(this.adapters.values()).map((a) => ({
      id: a.id,
      name: a.name,
      defaultSettings: { ...a.defaultSettings }
    }))
  }

  dispose(): void {
    this.queue.clear()
    for (const adapter of this.adapters.values()) {
      adapter.dispose()
    }
  }

  private loadSettings(): TtsSettings {
    const defaults: TtsSettings = {
      enabled: false,
      adapterId: '',
      enabledEvents: [...ALL_EVENT_TYPES],
      speed: 1,
      volume: 1,
      adapterSettings: {}
    }

    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'))
        return {
          enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaults.enabled,
          adapterId: typeof raw.adapterId === 'string' ? raw.adapterId : defaults.adapterId,
          enabledEvents: Array.isArray(raw.enabledEvents)
            ? raw.enabledEvents.filter(isValidEventType)
            : defaults.enabledEvents,
          speed: typeof raw.speed === 'number' ? raw.speed : defaults.speed,
          volume: typeof raw.volume === 'number' ? raw.volume : defaults.volume,
          adapterSettings:
            typeof raw.adapterSettings === 'object' && raw.adapterSettings !== null
              ? raw.adapterSettings
              : defaults.adapterSettings
        }
      }
    } catch (err) {
      console.error('[TTS] Failed to load settings:', err)
    }
    return defaults
  }

  private saveSettings(): void {
    const dir = path.dirname(this.settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8')
  }
}
