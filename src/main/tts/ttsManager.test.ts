import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { TtsManager } from './ttsManager'
import type { TtsAdapter } from './types'

function createMockAdapter(id = 'mock', name = 'Mock'): TtsAdapter {
  return {
    id,
    name,
    defaultSettings: { host: 'localhost', port: 50021 },
    speak: vi.fn<(text: string, speed: number, volume: number) => Promise<void>>().mockResolvedValue(undefined),
    isAvailable: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    dispose: vi.fn()
  }
}

describe('TtsManager', () => {
  let tmpDir: string
  let manager: TtsManager

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-test-'))
    manager = new TtsManager(tmpDir)
  })

  afterEach(() => {
    manager.dispose()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('初期設定は enabled=false', () => {
    const settings = manager.getSettings()
    expect(settings.enabled).toBe(false)
    expect(settings.speed).toBe(1)
    expect(settings.volume).toBe(1)
  })

  it('registerAdapter でアダプターを登録できる', () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)

    const infos = manager.getAdapterInfos()
    expect(infos).toHaveLength(1)
    expect(infos[0].id).toBe('mock')
    expect(infos[0].name).toBe('Mock')
  })

  it('複数のアダプターを登録できる', () => {
    manager.registerAdapter(createMockAdapter('a', 'Adapter A'))
    manager.registerAdapter(createMockAdapter('b', 'Adapter B'))

    expect(manager.getAdapterInfos()).toHaveLength(2)
  })

  it('setSettings で設定を変更して永続化できる', () => {
    manager.setSettings({ enabled: true, speed: 1.5, volume: 0.8 })

    const settings = manager.getSettings()
    expect(settings.enabled).toBe(true)
    expect(settings.speed).toBe(1.5)
    expect(settings.volume).toBe(0.8)

    // ファイルに永続化されていることを確認
    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tts-settings.json'), 'utf-8'))
    expect(saved.enabled).toBe(true)
    expect(saved.speed).toBe(1.5)
  })

  it('設定ファイルから復元できる', () => {
    manager.setSettings({ enabled: true, adapterId: 'voicevox', speed: 1.2 })

    // 新しいインスタンスで復元
    const manager2 = new TtsManager(tmpDir)
    const settings = manager2.getSettings()
    expect(settings.enabled).toBe(true)
    expect(settings.adapterId).toBe('voicevox')
    expect(settings.speed).toBe(1.2)
    manager2.dispose()
  })

  it('handleEvent は enabled=false のとき何もしない', async () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)
    manager.setSettings({ adapterId: 'mock' })

    manager.handleEvent('comment', { content: 'テスト' })

    await new Promise((r) => setTimeout(r, 50))
    expect(adapter.speak).not.toHaveBeenCalled()
  })

  it('handleEvent は enabledEvents に含まれないイベントを無視する', async () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)
    manager.setSettings({ enabled: true, adapterId: 'mock', enabledEvents: ['gift'] })

    manager.handleEvent('comment', { content: 'テスト' })

    await new Promise((r) => setTimeout(r, 50))
    expect(adapter.speak).not.toHaveBeenCalled()
  })

  it('handleEvent が enabled + 対象イベントのときアダプターの speak が呼ばれる', async () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)
    manager.setSettings({ enabled: true, adapterId: 'mock' })

    manager.handleEvent('comment', { content: 'こんにちは' })

    await vi.waitFor(() => {
      expect(adapter.speak).toHaveBeenCalledWith('こんにちは', 1, 1)
    })
  })

  it('setSettings で enabledEvents の不正な値はフィルタされる', () => {
    manager.setSettings({ enabledEvents: ['comment', 'invalid' as any, 'gift'] })

    const settings = manager.getSettings()
    expect(settings.enabledEvents).toEqual(['comment', 'gift'])
  })

  it('dispose でアダプターの dispose が呼ばれる', () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)

    manager.dispose()

    expect(adapter.dispose).toHaveBeenCalled()
  })

  it('setSettings で adapterId を変更するとアダプターが切り替わる', async () => {
    const adapterA = createMockAdapter('a', 'A')
    const adapterB = createMockAdapter('b', 'B')
    manager.registerAdapter(adapterA)
    manager.registerAdapter(adapterB)
    manager.setSettings({ enabled: true, adapterId: 'a' })

    manager.handleEvent('comment', { content: 'Aに送信' })
    await vi.waitFor(() => {
      expect(adapterA.speak).toHaveBeenCalledWith('Aに送信', 1, 1)
    })

    manager.setSettings({ adapterId: 'b' })
    manager.handleEvent('comment', { content: 'Bに送信' })
    await vi.waitFor(() => {
      expect(adapterB.speak).toHaveBeenCalledWith('Bに送信', 1, 1)
    })
  })
})
