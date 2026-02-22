import path from 'path'
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest'
import { createServer, type CommentServer } from './server'
import WebSocket from 'ws'

const TEST_HTTP_PORT = 13939
const TEST_WS_PORT = 13940
const PLUGIN_PATH = path.join(__dirname, '../../resources/plugins/md3-comment-list')

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

/** Connect and eagerly collect all messages from the start (avoids race with history replay). */
function connectAndCollect(port: number): Promise<{ ws: WebSocket; messages: unknown[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`)
    const messages: unknown[] = []
    ws.on('message', (raw) => {
      messages.push(JSON.parse(raw.toString()))
    })
    ws.on('open', () => resolve({ ws, messages }))
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
    server.registerPluginRoute('md3-comment-list', PLUGIN_PATH)
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
    it('GET / がプラグイン一覧を返す', async () => {
      const res = await fetch(`http://localhost:${TEST_HTTP_PORT}/`)
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('NicomView Plugins')
      expect(text).toContain('md3-comment-list')
    })

    it('プラグインの静的ファイルを配信する', async () => {
      const res = await fetch(
        `http://localhost:${TEST_HTTP_PORT}/plugins/md3-comment-list/overlay/index.html`
      )
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('NicomView')
    })
  })
})

describe('history replay', () => {
  const HISTORY_HTTP_PORT = 14939
  const HISTORY_WS_PORT = 14940
  let server: CommentServer
  let clients: WebSocket[]

  beforeEach(async () => {
    server = await createServer({
      httpPort: HISTORY_HTTP_PORT,
      wsPort: HISTORY_WS_PORT
    })
    clients = []
  })

  afterEach(async () => {
    for (const client of clients) {
      client.close()
    }
    await server.close()
  })

  it('新規接続時に過去のコメントを isHistory: true 付きで送信する', async () => {
    server.broadcast('comment', { content: 'history-a' })
    server.broadcast('comment', { content: 'history-b' })

    const { ws, messages } = await connectAndCollect(HISTORY_WS_PORT)
    clients = [ws]

    // wait for history messages to arrive
    await vi.waitFor(() => expect(messages).toHaveLength(2))

    expect(messages[0]).toEqual({ event: 'comment', data: { content: 'history-a', isHistory: true } })
    expect(messages[1]).toEqual({ event: 'comment', data: { content: 'history-b', isHistory: true } })
  })

  it('バッファが200件を超えたら古いものが消える', async () => {
    for (let i = 0; i < 202; i++) {
      server.broadcast('comment', { content: `msg-${i}` })
    }

    const { ws, messages } = await connectAndCollect(HISTORY_WS_PORT)
    clients = [ws]

    await vi.waitFor(() => expect(messages).toHaveLength(200))

    // oldest 2 (msg-0, msg-1) were shifted out
    expect(messages[0]).toEqual({
      event: 'comment',
      data: { content: 'msg-2', isHistory: true }
    })
    expect(messages[199]).toEqual({
      event: 'comment',
      data: { content: 'msg-201', isHistory: true }
    })
  })
})
