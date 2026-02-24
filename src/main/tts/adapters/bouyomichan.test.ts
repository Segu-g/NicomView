import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BouyomichanAdapter } from './bouyomichan'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('BouyomichanAdapter', () => {
  let adapter: BouyomichanAdapter

  beforeEach(() => {
    fetchMock.mockReset()
    adapter = new BouyomichanAdapter()
  })

  describe('speak', () => {
    it('正しい URL とパラメータで fetch を呼ぶ', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      await adapter.speak('テスト', 1, 1)

      expect(fetchMock).toHaveBeenCalledOnce()
      const url = new URL(fetchMock.mock.calls[0][0])
      expect(url.origin).toBe('http://localhost:50080')
      expect(url.pathname).toBe('/Talk')
      expect(url.searchParams.get('text')).toBe('テスト')
      expect(url.searchParams.get('voice')).toBe('0')
      expect(url.searchParams.get('speed')).toBe('100')
      expect(url.searchParams.get('volume')).toBe('50')
      expect(url.searchParams.get('tone')).toBe('-1')
    })

    it('speakerOverride で voice が上書きされる', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      await adapter.speak('テスト', 1, 1, 3)

      const url = new URL(fetchMock.mock.calls[0][0])
      expect(url.searchParams.get('voice')).toBe('3')
    })

    it('speed を正しく変換する (0.5 → 50, 2.0 → 200)', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      await adapter.speak('テスト', 0.5, 1)
      const url1 = new URL(fetchMock.mock.calls[0][0])
      expect(url1.searchParams.get('speed')).toBe('50')

      await adapter.speak('テスト', 2.0, 1)
      const url2 = new URL(fetchMock.mock.calls[1][0])
      expect(url2.searchParams.get('speed')).toBe('200')
    })

    it('volume を正しく変換する (0 → 0, 2.0 → 100)', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      await adapter.speak('テスト', 1, 0)
      const url1 = new URL(fetchMock.mock.calls[0][0])
      expect(url1.searchParams.get('volume')).toBe('0')

      await adapter.speak('テスト', 1, 2.0)
      const url2 = new URL(fetchMock.mock.calls[1][0])
      expect(url2.searchParams.get('volume')).toBe('100')
    })

    it('HTTP エラー時に例外を投げる', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 })

      await expect(adapter.speak('テスト', 1, 1)).rejects.toThrow('BouyomiChan Talk failed: 500')
    })
  })

  describe('getParamDefs', () => {
    it('host, port, voice, tone の 4 項目を返す', async () => {
      const defs = await adapter.getParamDefs()
      expect(defs).toHaveLength(4)
      expect(defs.map((d) => d.key)).toEqual(['host', 'port', 'voice', 'tone'])
    })

    it('voice は select タイプで 9 個のオプションを持つ', async () => {
      const defs = await adapter.getParamDefs()
      const voiceDef = defs.find((d) => d.key === 'voice')!
      expect(voiceDef.type).toBe('select')
      expect(voiceDef.options).toHaveLength(9)
    })
  })

  describe('isAvailable', () => {
    it('fetch 成功時に true を返す', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      expect(await adapter.isAvailable()).toBe(true)
      const url = new URL(fetchMock.mock.calls[0][0])
      expect(url.searchParams.get('text')).toBe('')
    })

    it('fetch エラー時に false を返す', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

      expect(await adapter.isAvailable()).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('設定を反映して speak に使用する', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      adapter.updateSettings({ host: '192.168.1.10', port: 60080, voice: 5, tone: 100 })

      await adapter.speak('テスト', 1, 1)

      const url = new URL(fetchMock.mock.calls[0][0])
      expect(url.origin).toBe('http://192.168.1.10:60080')
      expect(url.searchParams.get('voice')).toBe('5')
      expect(url.searchParams.get('tone')).toBe('100')
    })
  })

  describe('constructor', () => {
    it('初期設定を受け取れる', async () => {
      fetchMock.mockResolvedValue({ ok: true })
      const custom = new BouyomichanAdapter({ host: '10.0.0.1', port: 9999, voice: 2, tone: 50 })

      await custom.speak('テスト', 1, 1)

      const url = new URL(fetchMock.mock.calls[0][0])
      expect(url.origin).toBe('http://10.0.0.1:9999')
      expect(url.searchParams.get('voice')).toBe('2')
      expect(url.searchParams.get('tone')).toBe('50')
    })
  })
})
