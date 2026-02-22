import { contextBridge, ipcRenderer } from 'electron'
import type {
  ConnectionState,
  PluginDescriptor,
  PluginPreferences,
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
  }
}

contextBridge.exposeInMainWorld('commentViewerAPI', api)
