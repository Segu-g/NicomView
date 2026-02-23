import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'

export interface CommentServer {
  broadcast(event: string, data: unknown): void
  clearHistory(): void
  registerPluginRoute(pluginId: string, fsPath: string): void
  close(): Promise<void>
}

export interface ServerOptions {
  httpPort?: number
  wsPort?: number
}

export async function createServer(options: ServerOptions = {}): Promise<CommentServer> {
  const { httpPort = 3939, wsPort = 3940 } = options

  const app = express()
  const pluginIds: string[] = []

  app.get('/', (_req, res) => {
    const links = pluginIds
      .map((id) => `<li><a href="/plugins/${id}/overlay/">${id}</a></li>`)
      .join('\n')
    res.send(`<html><body><h1>NicomView Plugins</h1><ul>${links}</ul></body></html>`)
  })

  const httpServer = http.createServer(app)
  const wss = new WebSocketServer({ port: wsPort })
  const historyBuffer: { event: string; data: unknown }[] = []
  const HISTORY_MAX = 200

  wss.on('connection', (client) => {
    for (const entry of historyBuffer) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: entry.event, data: { ...(entry.data as Record<string, unknown>), isHistory: true } }))
      }
    }
  })

  await new Promise<void>((resolve) => {
    httpServer.listen(httpPort, resolve)
  })

  function broadcast(event: string, data: unknown): void {
    historyBuffer.push({ event, data })
    if (historyBuffer.length > HISTORY_MAX) {
      historyBuffer.shift()
    }
    const message = JSON.stringify({ event, data })
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }

  function clearHistory(): void {
    historyBuffer.length = 0
    const message = JSON.stringify({ event: 'clear', data: {} })
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }

  function registerPluginRoute(pluginId: string, fsPath: string): void {
    pluginIds.push(pluginId)
    app.use(`/plugins/${pluginId}`, express.static(fsPath))
  }

  async function close(): Promise<void> {
    for (const client of wss.clients) {
      client.terminate()
    }
    await new Promise<void>((resolve, reject) => {
      wss.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  return { broadcast, clearHistory, registerPluginRoute, close }
}
