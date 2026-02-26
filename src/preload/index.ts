import { contextBridge, ipcRenderer } from 'electron'
import type {
  ConnectionState,
  PluginDescriptor,
  PluginPreferences,
  PluginSettings,
  TtsSettings,
  TtsAdapterInfo,
  TtsAdapterParamDef,
  CommentViewerAPI
} from '../shared/types'

const api: CommentViewerAPI = {
  connect(liveId: string, cookies?: string): Promise<void> {
    return ipcRenderer.invoke('connect', liveId, cookies)
  },

  disconnect(): Promise<void> {
    return ipcRenderer.invoke('disconnect')
  },

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, state: ConnectionState) => {
      callback(state)
    }
    ipcRenderer.on('state-change', handler)
    return () => {
      ipcRenderer.removeListener('state-change', handler)
    }
  },

  getPlugins(): Promise<PluginDescriptor[]> {
    return ipcRenderer.invoke('get-plugins')
  },

  getPluginPreferences(): Promise<PluginPreferences> {
    return ipcRenderer.invoke('get-plugin-preferences')
  },

  setPluginPreferences(prefs: Partial<PluginPreferences>): Promise<void> {
    return ipcRenderer.invoke('set-plugin-preferences', prefs)
  },

  getPluginSettings(pluginId: string): Promise<PluginSettings> {
    return ipcRenderer.invoke('get-plugin-settings', pluginId)
  },

  setPluginSettings(pluginId: string, settings: PluginSettings): Promise<void> {
    return ipcRenderer.invoke('set-plugin-settings', pluginId, settings)
  },

  getTtsSettings(): Promise<TtsSettings> {
    return ipcRenderer.invoke('get-tts-settings')
  },

  setTtsSettings(settings: Partial<TtsSettings>): Promise<void> {
    return ipcRenderer.invoke('set-tts-settings', settings)
  },

  getTtsAdapters(): Promise<TtsAdapterInfo[]> {
    return ipcRenderer.invoke('get-tts-adapters')
  },

  getTtsAdapterParams(adapterId: string): Promise<TtsAdapterParamDef[]> {
    return ipcRenderer.invoke('get-tts-adapter-params', adapterId)
  },

  openPluginFolder(): Promise<void> {
    return ipcRenderer.invoke('open-plugin-folder')
  }
}

contextBridge.exposeInMainWorld('commentViewerAPI', api)
