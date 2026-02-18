import path from 'path'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createServer, type CommentServer } from './server'
import WebSocket from 'ws'

const TEST_HTTP_PORT = 13939
const TEST_WS_PORT = 13940
const PLUGIN_PATH = path.join(__dirname, '../../resources/plugins/nico-scroll')

function waitForMessage(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve) => {
    ws.once('message', (data) => {
      resolve(JSON.parse(data.toString()))
    })
  })
}

function connectWs(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`)
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
  })
}

describe('server', () => {
  let server: CommentServer

  beforeAll(async () => {
    server = await createServer({
      httpPort: TEST_HTTP_PORT,
      wsPort: TEST_WS_PORT
    })
    server.registerPluginRoute('nico-scroll', PLUGIN_PATH)
    server.setOverlayRedirect('nico-scroll')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('broadcast', () => {
    let clients: WebSocket[]

    afterEach(() => {
      for (const client of clients) {
        client.close()
      }
      clients = []
    })

    it('接続中のWebSocketクライアントにメッセージを送信する', async () => {
      clients = [await connectWs(TEST_WS_PORT)]
      const msgPromise = waitForMessage(clients[0])

      server.broadcast('comment', { content: 'test' })

      const received = await msgPromise
      expect(received).toEqual({ event: 'comment', data: { content: 'test' } })
    })

    it('クライアントが0件のときエラーにならない', () => {
      clients = []
      expect(() => server.broadcast('comment', { content: 'test' })).not.toThrow()
    })

    it('複数クライアントに同時送信する', async () => {
      clients = [
        await connectWs(TEST_WS_PORT),
        await connectWs(TEST_WS_PORT),
        await connectWs(TEST_WS_PORT)
      ]

      const msgPromises = clients.map((c) => waitForMessage(c))
      server.broadcast('comment', { content: 'hello' })

      const results = await Promise.all(msgPromises)
      for (const result of results) {
        expect(result).toEqual({ event: 'comment', data: { content: 'hello' } })
      }
    })
  })

  describe('HTTP server', () => {
    it('GET / がアクティブオーバーレイにリダイレクトする', async () => {
      const res = await fetch(`http://localhost:${TEST_HTTP_PORT}/`, { redirect: 'manual' })
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/plugins/nico-scroll/overlay/')
    })

    it('プラグインの静的ファイルを配信する', async () => {
      const res = await fetch(
        `http://localhost:${TEST_HTTP_PORT}/plugins/nico-scroll/overlay/index.html`
      )
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('NicomView Overlay')
    })
  })
})
