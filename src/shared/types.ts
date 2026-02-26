export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export type CommentEventType = 'comment' | 'gift' | 'emotion' | 'notification' | 'operatorComment'

export const ALL_EVENT_TYPES: CommentEventType[] = [
  'comment',
  'gift',
  'emotion',
  'notification',
  'operatorComment'
]

export const DEFAULT_TTS_TEMPLATES: Record<CommentEventType, string> = {
  comment: '{content}',
  gift: '{userName}さんが{itemName}を贈りました',
  emotion: '{content}',
  notification: '{message}',
  operatorComment: '運営コメント: {content}'
}

export type PluginSettings = Record<string, string | number | boolean>

export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  overlay: boolean
  defaultFontSize?: number
  settings?: boolean
  settingsPopup?: boolean
}

export interface PluginDescriptor extends PluginManifest {
  builtIn: boolean
  basePath: string
}

export interface PluginPreferences {
  enabledEvents: CommentEventType[]
}

export type PluginSettingsMessage =
  | { type: 'nicomview:ready'; pluginId: string }
  | { type: 'nicomview:settings-update'; pluginId: string; settings: PluginSettings }
  | { type: 'nicomview:settings-init'; settings: PluginSettings }

export interface TtsSettings {
  enabled: boolean
  adapterId: string
  enabledEvents: CommentEventType[]
  speed: number
  volume: number
  adapterSettings: Record<string, string | number | boolean>
  formatTemplates: Record<CommentEventType, string>
  speakerOverrides: Partial<Record<CommentEventType, number | string>>
}

export interface TtsAdapterInfo {
  id: string
  name: string
  defaultSettings: Record<string, string | number | boolean>
}

export interface TtsAdapterParamOption {
  value: string | number
  label: string
}

export interface TtsAdapterParamDef {
  key: string
  label: string
  type: 'string' | 'number' | 'select'
  defaultValue: string | number
  min?: number
  max?: number
  step?: number
  options?: TtsAdapterParamOption[]
}

export interface CommentViewerAPI {
  connect(liveId: string, cookies?: string): Promise<void>
  disconnect(): Promise<void>
  onStateChange(callback: (state: ConnectionState) => void): () => void
  getPlugins(): Promise<PluginDescriptor[]>
  getPluginPreferences(): Promise<PluginPreferences>
  setPluginPreferences(prefs: Partial<PluginPreferences>): Promise<void>
  getPluginSettings(pluginId: string): Promise<PluginSettings>
  setPluginSettings(pluginId: string, settings: PluginSettings): Promise<void>
  getTtsSettings(): Promise<TtsSettings>
  setTtsSettings(settings: Partial<TtsSettings>): Promise<void>
  getTtsAdapters(): Promise<TtsAdapterInfo[]>
  getTtsAdapterParams(adapterId: string): Promise<TtsAdapterParamDef[]>
  openPluginFolder(): Promise<void>
}
