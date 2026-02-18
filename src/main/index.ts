import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { NiconicoProvider } from 'nicomget'
import { createServer, type CommentServer } from './server'
import { CommentManager } from './commentManager'
import { PluginManager } from './pluginManager'
import type { CommentEventType, PluginPreferences } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let server: CommentServer | null = null
let commentManager: CommentManager | null = null
let pluginManager: PluginManager | null = null

const RELAY_EVENTS: CommentEventType[] = [
  'comment',
  'gift',
  'emotion',
  'notification',
  'operatorComment'
]

function getBuiltInPluginsPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'plugins')
  }
  return path.join(__dirname, '../../resources/plugins')
}

function getExternalPluginsPath(): string {
  return path.join(app.getPath('userData'), 'plugins')
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'NicomView'
  })

  // PluginManager 初期化
  pluginManager = new PluginManager(
    getBuiltInPluginsPath(),
    getExternalPluginsPath(),
    app.getPath('userData')
  )
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

    // アクティブオーバーレイプラグインのリダイレクト設定
    const prefs = pluginManager.getPreferences()
    server.setOverlayRedirect(prefs.activeOverlayPlugin)
  } catch (err) {
    console.error('Failed to start server:', err)
  }

  if (process.env.NODE_ENV === 'test') {
    ;(global as any).__testServer = server
  }

  // CommentManager 初期化
  commentManager = new CommentManager(
    (options) => new NiconicoProvider(options),
    (event, data) => {
      console.log(`[${event}]`, JSON.stringify(data))
      server?.broadcast(event, data)
      // レンダラーにもコメント転送
      mainWindow?.webContents.send('comment-event', {
        type: event,
        data,
        timestamp: Date.now()
      })
    },
    (state) => mainWindow?.webContents.send('state-change', state)
  )

  // IPC ハンドラ
  ipcMain.handle('connect', async (_event, liveId: string, cookies?: string) => {
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
    // オーバーレイプラグイン変更時はリダイレクトも更新
    if (prefs.activeOverlayPlugin !== undefined) {
      server?.setOverlayRedirect(prefs.activeOverlayPlugin)
    }
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

app.on('window-all-closed', async () => {
  commentManager?.disconnect()
  if (server) {
    await server.close()
  }
  app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
