import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import type { ConnectionState } from '../shared/types'
import { CommentManager } from './commentManager'

// NiconicoProvider のモック
class MockProvider extends EventEmitter {
  connect = vi.fn().mockResolvedValue(undefined)
  disconnect = vi.fn()
}

function createMockProvider() {
  return new MockProvider()
}

describe('CommentManager', () => {
  let mockProvider: MockProvider
  let mockProviderFactory: ReturnType<typeof vi.fn<(opts: { liveId: string; cookies?: string }) => MockProvider>>
  let broadcastFn: ReturnType<typeof vi.fn<(event: string, data: unknown) => void>>
  let stateChangeFn: ReturnType<typeof vi.fn<(state: ConnectionState) => void>>
  let manager: CommentManager

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockProviderFactory = vi.fn<(opts: { liveId: string; cookies?: string }) => MockProvider>().mockReturnValue(mockProvider)
    broadcastFn = vi.fn<(event: string, data: unknown) => void>()
    stateChangeFn = vi.fn<(state: ConnectionState) => void>()
    manager = new CommentManager(mockProviderFactory, broadcastFn, stateChangeFn)
  })

  describe('connect', () => {
    it('liveId を渡して NiconicoProvider に接続する', async () => {
      await manager.connect('lv123456789')

      expect(mockProviderFactory).toHaveBeenCalledWith({
        liveId: 'lv123456789'
      })
      expect(mockProvider.connect).toHaveBeenCalled()
    })

    it('cookies付きで接続できる', async () => {
      await manager.connect('lv123456789', 'session_cookie=abc')

      expect(mockProviderFactory).toHaveBeenCalledWith({
        liveId: 'lv123456789',
        cookies: 'session_cookie=abc'
      })
    })

    it('接続開始時に stateChange で connecting を通知する', async () => {
      await manager.connect('lv123456789')

      expect(stateChangeFn).toHaveBeenCalledWith('connecting')
    })

    it('すでに接続中の状態で connect を呼ぶと前の接続を切断してから再接続する', async () => {
      await manager.connect('lv111111111')

      const firstProvider = mockProvider
      mockProvider = createMockProvider()
      mockProviderFactory.mockReturnValue(mockProvider)

      await manager.connect('lv222222222')

      expect(firstProvider.disconnect).toHaveBeenCalled()
      expect(mockProvider.connect).toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('disconnect 後は stateChange で disconnected を通知する', async () => {
      await manager.connect('lv123456789')
      stateChangeFn.mockClear()

      manager.disconnect()

      expect(stateChangeFn).toHaveBeenCalledWith('disconnected')
    })

    it('disconnect 後に nicomget の disconnect() が呼ばれる', async () => {
      await manager.connect('lv123456789')

      manager.disconnect()

      expect(mockProvider.disconnect).toHaveBeenCalled()
    })
  })

  describe('イベント中継', () => {
    it('nicomget の comment イベントを broadcast に流す', async () => {
      await manager.connect('lv123456789')
      const comment = { content: 'テスト', userId: 'user1', timestamp: new Date() }

      mockProvider.emit('comment', comment)

      expect(broadcastFn).toHaveBeenCalledWith('comment', comment)
    })

    it('nicomget の gift イベントを broadcast に流す', async () => {
      await manager.connect('lv123456789')
      const gift = { itemName: 'ギフト', point: 100, userName: '送り主' }

      mockProvider.emit('gift', gift)

      expect(broadcastFn).toHaveBeenCalledWith('gift', gift)
    })

    it('nicomget の emotion イベントを broadcast に流す', async () => {
      await manager.connect('lv123456789')
      const emotion = { id: 'emo1', timestamp: new Date() }

      mockProvider.emit('emotion', emotion)

      expect(broadcastFn).toHaveBeenCalledWith('emotion', emotion)
    })

    it('nicomget の notification イベントを broadcast に流す', async () => {
      await manager.connect('lv123456789')
      const notification = { type: 'info', message: 'お知らせ' }

      mockProvider.emit('notification', notification)

      expect(broadcastFn).toHaveBeenCalledWith('notification', notification)
    })

    it('nicomget の operatorComment イベントを broadcast に流す', async () => {
      await manager.connect('lv123456789')
      const opComment = { content: '放送者コメント' }

      mockProvider.emit('operatorComment', opComment)

      expect(broadcastFn).toHaveBeenCalledWith('operatorComment', expect.objectContaining({ content: '放送者コメント' }))
    })

    it('nicomget の stateChange イベントを stateChange コールバックに通知する', async () => {
      await manager.connect('lv123456789')
      stateChangeFn.mockClear()

      mockProvider.emit('stateChange', 'connected')

      expect(stateChangeFn).toHaveBeenCalledWith('connected')
    })

    it('nicomget の error イベントを stateChange: error として通知する', async () => {
      await manager.connect('lv123456789')
      stateChangeFn.mockClear()

      mockProvider.emit('error', new Error('接続エラー'))

      expect(stateChangeFn).toHaveBeenCalledWith('error')
    })

    it('nicomget の end イベントで disconnected に遷移する', async () => {
      await manager.connect('lv123456789')
      stateChangeFn.mockClear()

      mockProvider.emit('end')

      expect(stateChangeFn).toHaveBeenCalledWith('disconnected')
    })

    it('end イベント後に disconnect() を呼んでもエラーにならない', async () => {
      await manager.connect('lv123456789')

      mockProvider.emit('end')

      expect(() => manager.disconnect()).not.toThrow()
    })
  })

  describe('operatorComment の放送者名補完', () => {
    it('metadata イベントの broadcasterName が operatorComment の name に補完される', async () => {
      await manager.connect('lv123456789')
      mockProvider.emit('metadata', { broadcasterName: '放送者A' })

      mockProvider.emit('operatorComment', { content: 'こんにちは' })

      expect(broadcastFn).toHaveBeenCalledWith('operatorComment', {
        content: 'こんにちは',
        name: '放送者A'
      })
    })

    it('connect() 戻り値の broadcasterName が operatorComment の name に補完される', async () => {
      mockProvider.connect.mockResolvedValue({ broadcasterName: '放送者B' })
      await manager.connect('lv123456789')

      mockProvider.emit('operatorComment', { content: 'テスト' })

      expect(broadcastFn).toHaveBeenCalledWith('operatorComment', {
        content: 'テスト',
        name: '放送者B'
      })
    })

    it('data.name があっても broadcasterName を優先する', async () => {
      mockProvider.connect.mockResolvedValue({ broadcasterName: '放送者C' })
      await manager.connect('lv123456789')

      mockProvider.emit('operatorComment', { content: 'テスト', name: '古い名前' })

      expect(broadcastFn).toHaveBeenCalledWith('operatorComment', {
        content: 'テスト',
        name: '放送者C'
      })
    })

    it('broadcasterName がない場合は data.name にフォールバックする', async () => {
      await manager.connect('lv123456789')

      mockProvider.emit('operatorComment', { content: 'テスト', name: '放送者D' })

      expect(broadcastFn).toHaveBeenCalledWith('operatorComment', {
        content: 'テスト',
        name: '放送者D'
      })
    })
  })
})
