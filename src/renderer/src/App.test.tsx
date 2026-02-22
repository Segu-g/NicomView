import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ConnectionState, CommentViewerAPI } from '../../shared/types'
import App from './App'

let stateChangeCallback: ((state: ConnectionState) => void) | null = null

beforeEach(() => {
  stateChangeCallback = null
  window.commentViewerAPI = {
    connect: vi.fn<CommentViewerAPI['connect']>().mockResolvedValue(undefined),
    disconnect: vi.fn<CommentViewerAPI['disconnect']>().mockResolvedValue(undefined),
    onStateChange: vi.fn<CommentViewerAPI['onStateChange']>().mockImplementation((cb) => {
      stateChangeCallback = cb
      return () => {
        stateChangeCallback = null
      }
    }),
    getPlugins: vi.fn<CommentViewerAPI['getPlugins']>().mockResolvedValue([
      {
        id: 'md3-comment-list',
        name: 'MD3 コメントリスト',
        version: '1.0.0',
        overlay: true,
        builtIn: true,
        basePath: '/plugins/md3-comment-list'
      },
      {
        id: 'nico-scroll',
        name: 'ニコニコ風スクロール',
        version: '1.0.0',
        overlay: true,
        builtIn: true,
        basePath: '/plugins/nico-scroll'
      }
    ]),
    getPluginPreferences: vi.fn<CommentViewerAPI['getPluginPreferences']>().mockResolvedValue({
      enabledEvents: ['comment', 'gift', 'emotion', 'notification', 'operatorComment']
    }),
    setPluginPreferences: vi.fn<CommentViewerAPI['setPluginPreferences']>().mockResolvedValue(undefined)
  }
})

describe('App', () => {
  describe('初期状態', () => {
    it('接続ボタンが表示されている', async () => {
      render(<App />)
      await screen.findByText('MD3 コメントリスト')
      expect(screen.getByRole('button', { name: '接続' })).toBeInTheDocument()
    })

    it('放送ID入力フィールドが空である', async () => {
      render(<App />)
      await screen.findByText('MD3 コメントリスト')
      expect(screen.getByPlaceholderText('lv123456789')).toHaveValue('')
    })

    it('表示プラグインセクションが表示されている', async () => {
      render(<App />)
      await screen.findByText('MD3 コメントリスト')
      expect(screen.getByText('表示プラグイン')).toBeInTheDocument()
    })

    it('プラグインURLがロード後に表示される', async () => {
      render(<App />)
      expect(
        await screen.findByText('http://localhost:3939/plugins/md3-comment-list/overlay/')
      ).toBeInTheDocument()
      expect(
        screen.getByText('http://localhost:3939/plugins/nico-scroll/overlay/')
      ).toBeInTheDocument()
    })
  })

  describe('接続操作', () => {
    it('放送IDを入力して接続ボタンを押すと connect が呼ばれる', async () => {
      render(<App />)
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('lv123456789'), 'lv123456789')
      await user.click(screen.getByRole('button', { name: '接続' }))
      expect(window.commentViewerAPI.connect).toHaveBeenCalledWith('lv123456789', undefined)
    })

    it('放送IDが空のとき接続ボタンを押してもconnectが呼ばれない', async () => {
      render(<App />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: '接続' }))
      expect(window.commentViewerAPI.connect).not.toHaveBeenCalled()
    })
  })

  describe('接続状態の表示', () => {
    it('error になるとエラーメッセージが表示される', async () => {
      render(<App />)
      await act(() => {
        stateChangeCallback?.('error')
      })
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('connecting 中は接続ボタンが無効になる', async () => {
      render(<App />)
      await act(() => {
        stateChangeCallback?.('connecting')
      })
      expect(screen.getByRole('button', { name: /接続/ })).toBeDisabled()
    })

    it('connected 状態で切断ボタンが表示される', async () => {
      render(<App />)
      await act(() => {
        stateChangeCallback?.('connected')
      })
      expect(screen.getByRole('button', { name: '切断' })).toBeInTheDocument()
    })

    it('切断ボタンを押すと disconnect が呼ばれる', async () => {
      render(<App />)
      const user = userEvent.setup()
      await act(() => {
        stateChangeCallback?.('connected')
      })
      await user.click(screen.getByRole('button', { name: '切断' }))
      expect(window.commentViewerAPI.disconnect).toHaveBeenCalled()
    })
  })
})
