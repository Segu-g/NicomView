import path from 'path'
import { saveJson, loadJsonRaw } from '../utils/jsonStore'
import type { CommentEventType, TtsSettings, TtsAdapterInfo, TtsAdapterParamDef } from '../../shared/types'
import { ALL_EVENT_TYPES, DEFAULT_TTS_TEMPLATES, isValidEventType } from '../../shared/types'
import type { TtsAdapter } from './types'
import { TtsQueue } from './queue'
import { formatTtsText } from './formatter'

const SETTINGS_FILE = 'tts-settings.json'

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
      adapter.updateSettings(this.settings.adapterSettings)
      this.queue.setAdapter(adapter)
    }
  }

  handleEvent(eventType: CommentEventType, data: unknown): void {
    if (!this.settings.enabled) return
    if (!this.settings.enabledEvents.includes(eventType)) return
    if (!this.queue) return

    const template = this.settings.formatTemplates[eventType]
    const text = formatTtsText(template, data as Record<string, unknown>)
    if (!text) return

    const speakerOverride = this.settings.speakerOverrides[eventType]
    this.queue.enqueue(text, speakerOverride)
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
      const currentAdapter = this.adapters.get(this.settings.adapterId)
      currentAdapter?.updateSettings(this.settings.adapterSettings)
    }
    if (partial.formatTemplates !== undefined) {
      this.settings.formatTemplates = { ...DEFAULT_TTS_TEMPLATES, ...partial.formatTemplates }
    }
    if (partial.speakerOverrides !== undefined) {
      this.settings.speakerOverrides = { ...partial.speakerOverrides }
    }

    this.queue.setParams(this.settings.speed, this.settings.volume)
    this.saveSettings()
  }

  async getAdapterParams(adapterId: string): Promise<TtsAdapterParamDef[]> {
    const adapter = this.adapters.get(adapterId)
    if (!adapter) return []
    return adapter.getParamDefs()
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
      adapterSettings: {},
      formatTemplates: { ...DEFAULT_TTS_TEMPLATES },
      speakerOverrides: {}
    }

    const raw = loadJsonRaw(this.settingsPath, 'TTS')
    if (typeof raw !== 'object' || raw === null) return defaults

    const r = raw as Record<string, unknown>
    return {
      enabled: typeof r.enabled === 'boolean' ? r.enabled : defaults.enabled,
      adapterId: typeof r.adapterId === 'string' ? r.adapterId : defaults.adapterId,
      enabledEvents: Array.isArray(r.enabledEvents)
        ? r.enabledEvents.filter(isValidEventType)
        : defaults.enabledEvents,
      speed: typeof r.speed === 'number' ? r.speed : defaults.speed,
      volume: typeof r.volume === 'number' ? r.volume : defaults.volume,
      adapterSettings:
        typeof r.adapterSettings === 'object' && r.adapterSettings !== null
          ? r.adapterSettings as Record<string, string | number | boolean>
          : defaults.adapterSettings,
      formatTemplates:
        typeof r.formatTemplates === 'object' && r.formatTemplates !== null
          ? { ...DEFAULT_TTS_TEMPLATES, ...(r.formatTemplates as Record<string, string>) }
          : defaults.formatTemplates,
      speakerOverrides:
        typeof r.speakerOverrides === 'object' && r.speakerOverrides !== null
          ? r.speakerOverrides as TtsSettings['speakerOverrides']
          : defaults.speakerOverrides
    }
  }

  private saveSettings(): void {
    saveJson(this.settingsPath, this.settings)
  }
}
