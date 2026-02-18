import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'

export interface CommentServer {
  broadcast(event: string, data: unknown): void
  registerPluginRoute(pluginId: string, fsPath: string): void
  setOverlayRedirect(pluginId: string | null): void
  close(): Promise<void>
}

export interface ServerOptions {
  httpPort?: number
  wsPort?: number
}

export async function createServer(options: ServerOptions = {}): Promise<CommentServer> {
  const { httpPort = 3939, wsPort = 3940 } = options

  const app = express()

  let overlayRedirectPlugin: string | null = null

  app.get('/', (_req, res) => {
    if (overlayRedirectPlugin) {
      res.redirect(`/plugins/${overlayRedirectPlugin}/overlay/`)
    } else {
      res.status(404).send('No active overlay plugin')
    }
  })

  const httpServer = http.createServer(app)
  const wss = new WebSocketServer({ port: wsPort })

  await new Promise<void>((resolve) => {
    httpServer.listen(httpPort, resolve)
  })

  function broadcast(event: string, data: unknown): void {
    const message = JSON.stringify({ event, data })
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }

  function registerPluginRoute(pluginId: string, fsPath: string): void {
    app.use(`/plugins/${pluginId}`, express.static(fsPath))
  }

  function setOverlayRedirect(pluginId: string | null): void {
    overlayRedirectPlugin = pluginId
  }

  async function close(): Promise<void> {
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

  return { broadcast, registerPluginRoute, setOverlayRedirect, close }
}
