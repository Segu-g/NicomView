import fs from 'fs'
import path from 'path'
import type {
  PluginManifest,
  PluginDescriptor,
  PluginPreferences,
  PluginSettings,
  CommentEventType
} from '../shared/types'
import { ALL_EVENT_TYPES } from '../shared/types'

const PREFERENCES_FILE = 'plugin-preferences.json'
const SETTINGS_FILE = 'plugin-settings.json'

function isValidManifest(obj: unknown): obj is PluginManifest {
  if (typeof obj !== 'object' || obj === null) return false
  const m = obj as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    m.id.length > 0 &&
    typeof m.name === 'string' &&
    typeof m.version === 'string' &&
    typeof m.overlay === 'boolean'
  )
}

function isValidEventType(t: unknown): t is CommentEventType {
  return typeof t === 'string' && ALL_EVENT_TYPES.includes(t as CommentEventType)
}

export class PluginManager {
  private plugins: Map<string, PluginDescriptor> = new Map()
  private preferences: PluginPreferences
  private preferencesPath: string
  private settingsPath: string
  private allSettings: Record<string, PluginSettings>
  private builtInDir: string
  private externalDir: string

  constructor(builtInDir: string, externalDir: string, userDataDir: string) {
    this.builtInDir = builtInDir
    this.externalDir = externalDir
    this.preferencesPath = path.join(userDataDir, PREFERENCES_FILE)
    this.settingsPath = path.join(userDataDir, SETTINGS_FILE)
    this.preferences = this.loadPreferences()
    this.allSettings = this.loadSettings()
  }

  discover(): void {
    this.plugins.clear()
    this.scanDirectory(this.builtInDir, true)
    this.scanDirectory(this.externalDir, false)
  }

  private scanDirectory(dir: string, builtIn: boolean): void {
    if (!fs.existsSync(dir)) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(dir, entry.name, 'plugin.json')
      if (!fs.existsSync(manifestPath)) continue

      try {
        const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        if (!isValidManifest(raw)) continue

        const descriptor: PluginDescriptor = {
          ...raw,
          builtIn,
          basePath: `/plugins/${raw.id}`
        }
        this.plugins.set(raw.id, descriptor)
      } catch {
        // Skip invalid manifests
      }
    }
  }

  getPlugins(): PluginDescriptor[] {
    return Array.from(this.plugins.values())
  }

  getPlugin(id: string): PluginDescriptor | undefined {
    return this.plugins.get(id)
  }

  getPreferences(): PluginPreferences {
    return { ...this.preferences }
  }

  setPreferences(partial: Partial<PluginPreferences>): void {
    if (partial.enabledEvents !== undefined) {
      this.preferences.enabledEvents = partial.enabledEvents.filter(isValidEventType)
    }
    this.savePreferences()
  }

  getPluginSettings(id: string): PluginSettings {
    return { ...(this.allSettings[id] ?? {}) }
  }

  setPluginSettings(id: string, settings: PluginSettings): void {
    this.allSettings[id] = { ...settings }
    this.saveSettings()
  }

  getPluginFsPath(id: string): string | undefined {
    const plugin = this.plugins.get(id)
    if (!plugin) return undefined

    const dir = plugin.builtIn ? this.builtInDir : this.externalDir
    return path.join(dir, id)
  }

  private loadSettings(): Record<string, PluginSettings> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'))
        if (typeof raw === 'object' && raw !== null) {
          return raw as Record<string, PluginSettings>
        }
      }
    } catch (err) {
      console.error('[PluginManager] Failed to load settings:', err)
    }
    return {}
  }

  private saveSettings(): void {
    const dir = path.dirname(this.settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.allSettings, null, 2), 'utf-8')
  }

  private loadPreferences(): PluginPreferences {
    const defaults: PluginPreferences = {
      enabledEvents: [...ALL_EVENT_TYPES]
    }

    try {
      if (fs.existsSync(this.preferencesPath)) {
        const raw = JSON.parse(fs.readFileSync(this.preferencesPath, 'utf-8'))
        return {
          enabledEvents: Array.isArray(raw.enabledEvents)
            ? raw.enabledEvents.filter(isValidEventType)
            : defaults.enabledEvents
        }
      }
    } catch (err) {
      console.error('[PluginManager] Failed to load preferences:', err)
    }
    return defaults
  }

  private savePreferences(): void {
    const dir = path.dirname(this.preferencesPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.preferencesPath, JSON.stringify(this.preferences, null, 2), 'utf-8')
  }
}
