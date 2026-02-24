import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { TtsManager } from './ttsManager'
import { DEFAULT_TTS_TEMPLATES } from '../../shared/types'
import type { TtsAdapter } from './types'

function createMockAdapter(id = 'mock', name = 'Mock'): TtsAdapter {
  return {
    id,
    name,
    defaultSettings: { host: 'localhost', port: 50021 },
    speak: vi.fn<(text: string, speed: number, volume: number, speakerOverride?: number | string) => Promise<void>>().mockResolvedValue(undefined),
    isAvailable: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    getParamDefs: vi.fn().mockResolvedValue([
      { key: 'host', label: 'ホスト', type: 'string', defaultValue: 'localhost' },
      { key: 'port', label: 'ポート', type: 'number', defaultValue: 50021 }
    ]),
    updateSettings: vi.fn(),
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
      expect(adapter.speak).toHaveBeenCalledWith('こんにちは', 1, 1, undefined)
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

  it('getAdapterParams が登録済みアダプターのパラメーター定義を返す', async () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)

    const params = await manager.getAdapterParams('mock')
    expect(params).toHaveLength(2)
    expect(params[0].key).toBe('host')
    expect(params[1].key).toBe('port')
  })

  it('getAdapterParams は未登録のアダプターIDに対して空配列を返す', async () => {
    const params = await manager.getAdapterParams('unknown')
    expect(params).toEqual([])
  })

  it('setSettings で adapterSettings を変更するとアダプターの updateSettings が呼ばれる', () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)
    manager.setSettings({ adapterId: 'mock' })

    manager.setSettings({ adapterSettings: { host: '192.168.1.1', port: 8080 } })

    expect(adapter.updateSettings).toHaveBeenCalledWith({ host: '192.168.1.1', port: 8080 })
  })

  it('registerAdapter 時に保存済み adapterSettings がアダプターに反映される', () => {
    manager.setSettings({ adapterId: 'mock', adapterSettings: { host: '10.0.0.1' } })

    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)

    expect(adapter.updateSettings).toHaveBeenCalledWith({ host: '10.0.0.1' })
  })

  it('setSettings で adapterId を変更するとアダプターが切り替わる', async () => {
    const adapterA = createMockAdapter('a', 'A')
    const adapterB = createMockAdapter('b', 'B')
    manager.registerAdapter(adapterA)
    manager.registerAdapter(adapterB)
    manager.setSettings({ enabled: true, adapterId: 'a' })

    manager.handleEvent('comment', { content: 'Aに送信' })
    await vi.waitFor(() => {
      expect(adapterA.speak).toHaveBeenCalledWith('Aに送信', 1, 1, undefined)
    })

    manager.setSettings({ adapterId: 'b' })
    manager.handleEvent('comment', { content: 'Bに送信' })
    await vi.waitFor(() => {
      expect(adapterB.speak).toHaveBeenCalledWith('Bに送信', 1, 1, undefined)
    })
  })

  it('初期設定で formatTemplates がデフォルト値を持つ', () => {
    const settings = manager.getSettings()
    expect(settings.formatTemplates).toEqual(DEFAULT_TTS_TEMPLATES)
  })

  it('setSettings で formatTemplates を変更して永続化できる', () => {
    manager.setSettings({
      formatTemplates: { ...DEFAULT_TTS_TEMPLATES, comment: '{userName}さん、{content}' }
    })

    const settings = manager.getSettings()
    expect(settings.formatTemplates.comment).toBe('{userName}さん、{content}')
    expect(settings.formatTemplates.gift).toBe(DEFAULT_TTS_TEMPLATES.gift)

    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tts-settings.json'), 'utf-8'))
    expect(saved.formatTemplates.comment).toBe('{userName}さん、{content}')
  })

  it('formatTemplates が設定ファイルから復元される', () => {
    manager.setSettings({
      formatTemplates: { ...DEFAULT_TTS_TEMPLATES, gift: '{userName}からギフト' }
    })

    const manager2 = new TtsManager(tmpDir)
    const settings = manager2.getSettings()
    expect(settings.formatTemplates.gift).toBe('{userName}からギフト')
    expect(settings.formatTemplates.comment).toBe(DEFAULT_TTS_TEMPLATES.comment)
    manager2.dispose()
  })

  it('handleEvent がカスタムテンプレートを使って読み上げる', async () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)
    manager.setSettings({
      enabled: true,
      adapterId: 'mock',
      formatTemplates: { ...DEFAULT_TTS_TEMPLATES, comment: '{userName}さん、{content}' }
    })

    manager.handleEvent('comment', { userName: 'たろう', content: 'こんにちは' })

    await vi.waitFor(() => {
      expect(adapter.speak).toHaveBeenCalledWith('たろうさん、こんにちは', 1, 1, undefined)
    })
  })

  it('初期設定で speakerOverrides が空オブジェクトである', () => {
    const settings = manager.getSettings()
    expect(settings.speakerOverrides).toEqual({})
  })

  it('setSettings で speakerOverrides を変更して永続化できる', () => {
    manager.setSettings({ speakerOverrides: { comment: 3, gift: 5 } })

    const settings = manager.getSettings()
    expect(settings.speakerOverrides).toEqual({ comment: 3, gift: 5 })

    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tts-settings.json'), 'utf-8'))
    expect(saved.speakerOverrides).toEqual({ comment: 3, gift: 5 })
  })

  it('speakerOverrides が設定ファイルから復元される', () => {
    manager.setSettings({ speakerOverrides: { emotion: 7 } })

    const manager2 = new TtsManager(tmpDir)
    const settings = manager2.getSettings()
    expect(settings.speakerOverrides).toEqual({ emotion: 7 })
    manager2.dispose()
  })

  it('handleEvent が speakerOverrides を反映して speak に渡す', async () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)
    manager.setSettings({
      enabled: true,
      adapterId: 'mock',
      speakerOverrides: { comment: 10 }
    })

    manager.handleEvent('comment', { content: 'テスト' })

    await vi.waitFor(() => {
      expect(adapter.speak).toHaveBeenCalledWith('テスト', 1, 1, 10)
    })
  })

  it('speakerOverrides 未設定のイベントは undefined を渡す', async () => {
    const adapter = createMockAdapter()
    manager.registerAdapter(adapter)
    manager.setSettings({
      enabled: true,
      adapterId: 'mock',
      speakerOverrides: { gift: 5 }
    })

    manager.handleEvent('comment', { content: 'テスト' })

    await vi.waitFor(() => {
      expect(adapter.speak).toHaveBeenCalledWith('テスト', 1, 1, undefined)
    })
  })
})
