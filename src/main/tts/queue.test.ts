import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TtsQueue } from './queue'
import type { TtsAdapter } from './types'

function createMockAdapter(): TtsAdapter {
  return {
    id: 'mock',
    name: 'Mock',
    defaultSettings: {},
    speak: vi.fn<(text: string, speed: number, volume: number) => Promise<void>>().mockResolvedValue(undefined),
    isAvailable: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    dispose: vi.fn()
  }
}

describe('TtsQueue', () => {
  let queue: TtsQueue
  let adapter: TtsAdapter

  beforeEach(() => {
    queue = new TtsQueue()
    adapter = createMockAdapter()
    queue.setAdapter(adapter)
    queue.setParams(1, 1)
  })

  it('enqueue したテキストが adapter.speak に渡される', async () => {
    queue.enqueue('テスト')
    // speak は非同期で呼ばれるので少し待つ
    await vi.waitFor(() => {
      expect(adapter.speak).toHaveBeenCalledWith('テスト', 1, 1)
    })
  })

  it('複数 enqueue すると順番に処理される', async () => {
    const order: string[] = []
    ;(adapter.speak as ReturnType<typeof vi.fn>).mockImplementation(async (text: string) => {
      order.push(text)
    })

    queue.enqueue('1番目')
    queue.enqueue('2番目')
    queue.enqueue('3番目')

    await vi.waitFor(() => {
      expect(order).toEqual(['1番目', '2番目', '3番目'])
    })
  })

  it('adapter が null のときは speak が呼ばれない', async () => {
    queue.setAdapter(null)
    queue.enqueue('テスト')
    await new Promise((r) => setTimeout(r, 50))
    expect(adapter.speak).not.toHaveBeenCalled()
  })

  it('clear するとキューが空になる', async () => {
    const order: string[] = []
    let resolveSpeak: (() => void) | null = null
    ;(adapter.speak as ReturnType<typeof vi.fn>).mockImplementation(async (text: string) => {
      order.push(text)
      if (text === '1番目') {
        await new Promise<void>((r) => { resolveSpeak = r })
      }
    })

    queue.enqueue('1番目')
    queue.enqueue('2番目')
    queue.enqueue('3番目')

    // 1番目の speak が始まるのを待つ
    await vi.waitFor(() => {
      expect(order).toContain('1番目')
    })

    queue.clear()
    resolveSpeak!()

    await new Promise((r) => setTimeout(r, 50))
    // 1番目だけ処理され、2番目・3番目はクリアされた
    expect(order).toEqual(['1番目'])
  })

  it('speak がエラーでも次のテキストが処理される', async () => {
    const order: string[] = []
    ;(adapter.speak as ReturnType<typeof vi.fn>).mockImplementation(async (text: string) => {
      if (text === 'エラー') throw new Error('fail')
      order.push(text)
    })

    queue.enqueue('エラー')
    queue.enqueue('次')

    await vi.waitFor(() => {
      expect(order).toEqual(['次'])
    })
  })

  it('setParams で速度・音量が反映される', async () => {
    queue.setParams(1.5, 0.8)
    queue.enqueue('テスト')

    await vi.waitFor(() => {
      expect(adapter.speak).toHaveBeenCalledWith('テスト', 1.5, 0.8)
    })
  })
})
