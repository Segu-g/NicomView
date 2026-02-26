import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { mkdirSync, readdirSync, cpSync, existsSync } from 'fs'

function getPluginsPath(): string {
  return path.join(app.getPath('userData'), 'plugins')
}
import { NiconicoProvider } from 'nicomget'
import { createServer, type CommentServer } from './server'
import { CommentManager } from './commentManager'
import { PluginManager } from './pluginManager'
import { TtsManager } from './tts/ttsManager'
import { VoicevoxAdapter } from './tts/adapters/voicevox'
import { BouyomichanAdapter } from './tts/adapters/bouyomichan'
import type { CommentEventType, PluginPreferences, PluginSettings, TtsSettings } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let server: CommentServer | null = null
let commentManager: CommentManager | null = null
let pluginManager: PluginManager | null = null
let ttsManager: TtsManager | null = null

function getBuiltInPluginsPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'plugins')
  }
  return path.join(__dirname, '../../resources/plugins')
}

/** ビルトインプラグインを userData/plugins/ へ同期コピーする */
function syncBuiltInPlugins(): void {
  const src = getBuiltInPluginsPath()
  const dest = getPluginsPath()
  mkdirSync(dest, { recursive: true })
  if (!existsSync(src)) return
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    cpSync(path.join(src, entry.name), path.join(dest, entry.name), { recursive: true })
  }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'NicomView'
  })

  // ビルトインプラグインを userData/plugins/ へ同期してから探索
  syncBuiltInPlugins()
  pluginManager = new PluginManager(getPluginsPath(), app.getPath('userData'))
  pluginManager.discover()

  // Express + WebSocket サーバー起動
  try {
    server = await createServer({
      httpPort: 3939,
      wsPort: 3940
    })

    // プラグインルート登録
    for (const plugin of pluginManager.getPlugins()) {
      const fsPath = pluginManager.getPluginFsPath(plugin.id)
      if (fsPath) {
        server.registerPluginRoute(plugin.id, fsPath)
      }
    }
  } catch (err) {
    console.error('Failed to start server:', err)
  }

  if (process.env.NODE_ENV === 'test') {
    ;(global as any).__testServer = server
  }

  // TtsManager 初期化
  ttsManager = new TtsManager(app.getPath('userData'))
  ttsManager.registerAdapter(new VoicevoxAdapter())
  ttsManager.registerAdapter(new BouyomichanAdapter())

  // CommentManager 初期化
  commentManager = new CommentManager(
    (options) => new NiconicoProvider(options),
    (event, data) => {
      console.log(`[${event}]`, JSON.stringify(data))
      server?.broadcast(event, data)
      ttsManager?.handleEvent(event as CommentEventType, data)
    },
    (state) => mainWindow?.webContents.send('state-change', state)
  )

  // IPC ハンドラ
  ipcMain.handle('connect', async (_event, liveId: string, cookies?: string) => {
    server?.clearHistory()
    await commentManager?.connect(liveId, cookies)
  })

  ipcMain.handle('disconnect', async () => {
    commentManager?.disconnect()
  })

  ipcMain.handle('get-plugins', () => {
    return pluginManager?.getPlugins() ?? []
  })

  ipcMain.handle('get-plugin-preferences', () => {
    return pluginManager?.getPreferences() ?? null
  })

  ipcMain.handle('set-plugin-preferences', (_event, prefs: Partial<PluginPreferences>) => {
    pluginManager?.setPreferences(prefs)
  })

  ipcMain.handle('get-plugin-settings', (_event, pluginId: string) => {
    return pluginManager?.getPluginSettings(pluginId) ?? {}
  })

  ipcMain.handle('set-plugin-settings', (_event, pluginId: string, settings: PluginSettings) => {
    pluginManager?.setPluginSettings(pluginId, settings)
  })

  ipcMain.handle('get-tts-settings', () => {
    return ttsManager?.getSettings() ?? null
  })

  ipcMain.handle('set-tts-settings', (_event, settings: Partial<TtsSettings>) => {
    ttsManager?.setSettings(settings)
  })

  ipcMain.handle('get-tts-adapters', () => {
    return ttsManager?.getAdapterInfos() ?? []
  })

  ipcMain.handle('get-tts-adapter-params', async (_event, adapterId: string) => {
    return (await ttsManager?.getAdapterParams(adapterId)) ?? []
  })

  ipcMain.handle('open-plugin-folder', () => {
    shell.openPath(getPluginsPath())
  })

  // レンダラーのコンソールログをメインプロセスに転送（デバッグ用）
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'LOG'
    console.log(`[Renderer ${prefix}] ${message} (${sourceId}:${line})`)
  })

  // レンダラーのロード
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  commentManager?.disconnect()
  ttsManager?.dispose()
  const cleanup = server ? server.close() : Promise.resolve()
  cleanup.finally(() => app.quit())
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
