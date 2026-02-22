export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export type CommentEventType = 'comment' | 'gift' | 'emotion' | 'notification' | 'operatorComment'

export const ALL_EVENT_TYPES: CommentEventType[] = [
  'comment',
  'gift',
  'emotion',
  'notification',
  'operatorComment'
]

export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  overlay: boolean
}

export interface PluginDescriptor extends PluginManifest {
  builtIn: boolean
  basePath: string
}

export interface PluginPreferences {
  enabledEvents: CommentEventType[]
}

export interface CommentViewerAPI {
  connect(liveId: string, cookies?: string): Promise<void>
  disconnect(): Promise<void>
  onStateChange(callback: (state: ConnectionState) => void): () => void
  getPlugins(): Promise<PluginDescriptor[]>
  getPluginPreferences(): Promise<PluginPreferences>
  setPluginPreferences(prefs: Partial<PluginPreferences>): Promise<void>
}
