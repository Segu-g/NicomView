import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { PluginSettings, PluginSettingsMessage } from '../../../shared/types'
import { loadPsd, type PsdData, type PsdLayer } from '../psdLoader'
import { fetchSpeakers, type VoicevoxSpeaker } from '../voicevoxClient'

const DEFAULTS: Record<string, string | number> = {
  psdFile: 'models/default.psd',
  voicevoxHost: 'http://localhost:50021',
  speaker: 0,
  speed: 1.0,
  volume: 1.0,
  threshold: 0.15,
  sensitivity: 8,
  mouthTransitionFrames: 4,
  blinkInterval: 3,
  blinkSpeed: 6,
  mouth0: '', mouth1: '', mouth2: '', mouth3: '', mouth4: '',
  eye0: '', eye1: '', eye2: '', eye3: '', eye4: '',
  layerVisibility: '{}',
  flipX: 0,
  flipY: 0,
}

const MOUTH_KEYS = ['mouth0', 'mouth1', 'mouth2', 'mouth3', 'mouth4'] as const
const EYE_KEYS = ['eye0', 'eye1', 'eye2', 'eye3', 'eye4'] as const
const ALL_ROLE_KEYS = [...MOUTH_KEYS, ...EYE_KEYS]

const ROLE_LABELS: Record<string, string> = {
  mouth0: '口: 閉じ',
  mouth1: '口: ほぼ閉じ',
  mouth2: '口: 半開き',
  mouth3: '口: ほぼ開き',
  mouth4: '口: 開き',
  eye0: '目: 開き',
  eye1: '目: ほぼ開き',
  eye2: '目: 半開き',
  eye3: '目: ほぼ閉じ',
  eye4: '目: 閉じ',
}

const OVERLAY_BASE = 'http://localhost:3939/plugins/psd-avatar/overlay/'

interface Props {
  pluginId: string
}

function isAncestorHiddenByVis(path: string, visibility: Record<string, boolean>): boolean {
  const parts = path.split('/')
  for (let i = 1; i < parts.length; i++) {
    if (visibility[parts.slice(0, i).join('/')] === false) return true
  }
  return false
}

function isAncestorCollapsed(path: string, collapsed: Set<string>): boolean {
  const parts = path.split('/')
  for (let i = 1; i < parts.length; i++) {
    if (collapsed.has(parts.slice(0, i).join('/'))) return true
  }
  return false
}

function parseVisibility(settings: Record<string, string | number>): Record<string, boolean> {
  try {
    const raw = settings.layerVisibility
    if (typeof raw === 'string' && raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function parseLayerPaths(value: string | number): string[] {
  const str = String(value ?? '')
  if (!str) return []
  if (str.startsWith('[')) {
    try { return JSON.parse(str) as string[] } catch { /* fall through */ }
  }
  return [str] // backward compat: plain path string
}

function buildRoleMap(settings: Record<string, string | number>): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const key of ALL_ROLE_KEYS) {
    for (const path of parseLayerPaths(settings[key] ?? '')) {
      if (!map[path]) map[path] = []
      map[path].push(key)
    }
  }
  return map
}

function buildPreviewUrl(settings: Record<string, string | number>, animate: boolean): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(settings)) {
    if (value !== '' && value != null) params.set(key, String(value))
  }
  if (!animate) params.set('preview', 'true')
  const qs = params.toString()
  return qs ? `${OVERLAY_BASE}?${qs}` : OVERLAY_BASE
}

export function Settings({ pluginId }: Props) {
  const [settings, setSettings] = useState<Record<string, string | number>>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [psd, setPsd] = useState<PsdData | null>(null)
  const [psdError, setPsdError] = useState<string | null>(null)
  const [psdLoading, setPsdLoading] = useState(false)
  const [speakers, setSpeakers] = useState<VoicevoxSpeaker[]>([])
  const [speakersError, setSpeakersError] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [previewAnimate, setPreviewAnimate] = useState(false)
  const [testText, setTestText] = useState('こんにちは')
  const previewRef = useRef<HTMLIFrameElement>(null)
  // settings-init を送ってきた親の origin を記録し、以降の返信に使用する
  const trustedOriginRef = useRef<string>('*')

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as PluginSettingsMessage
      if (msg?.type === 'nicomview:settings-init') {
        // 初回受信時に親 origin をキャプチャ（'*' ブロードキャストを防ぐ）
        trustedOriginRef.current = e.origin
        const s = msg.settings
        const merged: Record<string, string | number> = { ...DEFAULTS }
        for (const [key, value] of Object.entries(s)) {
          if (value !== '' && value != null) {
            merged[key] = value as string | number
          }
        }
        setSettings(merged)
        setReady(true)
      }
    }
    window.addEventListener('message', handler)
    // 初回 ready 通知: 親 origin 未確定のため '*' を使用（このメッセージにはペイロードなし）
    ;(window.opener || window.parent).postMessage({ type: 'nicomview:ready', pluginId }, '*')
    return () => window.removeEventListener('message', handler)
  }, [pluginId])

  const sendUpdate = useCallback(
    (updated: Record<string, string | number>) => {
      const ps: PluginSettings = {}
      for (const [key, value] of Object.entries(updated)) {
        ps[key] = value
      }
      ;(window.opener || window.parent).postMessage(
        { type: 'nicomview:settings-update', pluginId, settings: ps },
        trustedOriginRef.current  // キャプチャした親 origin に限定送信
      )
    },
    [pluginId]
  )

  const update = useCallback(
    (key: string, value: string | number) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        sendUpdate(next)
        return next
      })
    },
    [sendUpdate]
  )

  const updateMultiple = useCallback(
    (updates: Record<string, string | number>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates }
        sendUpdate(next)
        return next
      })
    },
    [sendUpdate]
  )

  const handleLoadPsd = useCallback(async () => {
    setPsdLoading(true)
    setPsdError(null)
    try {
      const psdFile = String(settings.psdFile)
      const url = `http://localhost:3939/plugins/psd-avatar/${psdFile}`
      const data = await loadPsd(url)
      setPsd(data)
    } catch (e) {
      setPsdError(String(e))
    }
    setPsdLoading(false)
  }, [settings.psdFile])

  const handleFetchSpeakers = useCallback(async () => {
    setSpeakersError(null)
    try {
      const host = String(settings.voicevoxHost)
      const list = await fetchSpeakers(host)
      setSpeakers(list)
    } catch (e) {
      setSpeakersError(String(e))
    }
  }, [settings.voicevoxHost])

  useEffect(() => {
    if (ready) handleFetchSpeakers()
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestSpeak = useCallback(() => {
    if (!testText.trim()) return
    previewRef.current?.contentWindow?.postMessage(
      { type: 'nicomview:test-speak', text: testText.trim() },
      '*'
    )
  }, [testText])

  const visibility = useMemo(() => parseVisibility(settings), [settings.layerVisibility])
  const roleMap = useMemo(() => buildRoleMap(settings), [
    settings.mouth0, settings.mouth1, settings.mouth2, settings.mouth3, settings.mouth4,
    settings.eye0, settings.eye1, settings.eye2, settings.eye3, settings.eye4,
  ])
  const previewUrl = useMemo(() => buildPreviewUrl(settings, previewAnimate), [settings, previewAnimate])

  const handleVisibilityToggle = useCallback(
    (layer: PsdLayer) => {
      if (layer.forceVisible) return
      const current = layer.path in visibility ? visibility[layer.path] : !layer.hidden
      if (layer.isRadio && !current) {
        // Turning on a radio leaf: turn off sibling radio leaves in same parent group
        const parentPath = layer.path.split('/').slice(0, -1).join('/') || '__root__'
        const next = { ...visibility, [layer.path]: true }
        for (const other of (psd?.layers ?? [])) {
          if (other.path === layer.path || other.isGroup || !other.isRadio) continue
          const otherParent = other.path.split('/').slice(0, -1).join('/') || '__root__'
          if (otherParent === parentPath) next[other.path] = false
        }
        update('layerVisibility', JSON.stringify(next))
      } else {
        update('layerVisibility', JSON.stringify({ ...visibility, [layer.path]: !current }))
      }
    },
    [visibility, update, psd]
  )

  const handleGroupVisibilityToggle = useCallback(
    (layer: PsdLayer) => {
      if (layer.forceVisible) return
      const current = layer.path in visibility ? visibility[layer.path] : !layer.hidden
      if (layer.isRadio) {
        // Radio group: turning on deselects sibling radio groups
        const parentPath = layer.path.split('/').slice(0, -1).join('/') || '__root__'
        const next = { ...visibility, [layer.path]: !current }
        if (!current) {
          for (const other of (psd?.layers ?? [])) {
            if (other.path === layer.path || !other.isGroup || !other.isRadio) continue
            const otherParent = other.path.split('/').slice(0, -1).join('/') || '__root__'
            if (otherParent === parentPath) next[other.path] = false
          }
        }
        update('layerVisibility', JSON.stringify(next))
      } else {
        update('layerVisibility', JSON.stringify({ ...visibility, [layer.path]: !current }))
      }
    },
    [visibility, update, psd]
  )

  const handleGroupToggle = useCallback((path: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const handleRoleToggle = useCallback(
    (layerPath: string, roleKey: string) => {
      const current = parseLayerPaths(settings[roleKey] ?? '')
      const idx = current.indexOf(layerPath)
      const next = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, layerPath]
      update(roleKey, JSON.stringify(next))
    },
    [settings, update]
  )

  if (!ready) return null

  const leafLayers = psd
    ? psd.layers.filter((l) => !l.isGroup && l.canvas !== null)
    : []

  const speakerOptions: { id: number; label: string }[] = []
  for (const s of speakers) {
    for (const style of s.styles) {
      speakerOptions.push({ id: style.id, label: `${s.name} (${style.name})` })
    }
  }

  return (
    <div className="settings-form">
      {/* PSD ファイル */}
      <div className="settings-section">
        <div className="settings-section-title">PSD ファイル</div>
        <div className="settings-row">
          <label className="settings-label">
            パス（プラグインディレクトリからの相対）
            <input
              type="text"
              value={settings.psdFile}
              onChange={(e) => update('psdFile', e.target.value)}
            />
          </label>
          <button
            className="settings-btn"
            onClick={handleLoadPsd}
            disabled={psdLoading}
          >
            {psdLoading ? '読込中...' : '読み込み'}
          </button>
        </div>
        {psdError && <div className="error-text">{psdError}</div>}
        {psd && <div className="success-text">{psd.width}x{psd.height} — {leafLayers.length} レイヤー</div>}
      </div>

      {/* レイヤーツリー + プレビュー */}
      {psd && (
        <div className="main-panes">
          <div className="pane-left">
            <div className="settings-section-title">レイヤー</div>
            <div className="layer-tree">
              {psd.layers.map((l) => {
                if (isAncestorCollapsed(l.path, collapsedGroups)) return null
                const depth = l.path.split('/').length - 1
                const parentPath = l.path.split('/').slice(0, -1).join('/') || '__root__'

                if (l.isGroup) {
                  const collapsed = collapsedGroups.has(l.path)
                  const isVisible = l.path in visibility ? visibility[l.path] : !l.hidden
                  const ancestorHidden = isAncestorHiddenByVis(l.path, visibility)
                  return (
                    <div key={l.path} className={`layer-item group${ancestorHidden ? ' dimmed' : ''}`} style={{ paddingLeft: depth * 16 }}>
                      {l.forceVisible ? (
                        <input type="checkbox" checked readOnly disabled />
                      ) : l.isRadio ? (
                        <input
                          type="radio"
                          name={parentPath}
                          checked={isVisible}
                          onChange={() => handleGroupVisibilityToggle(l)}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleGroupVisibilityToggle(l)}
                        />
                      )}
                      <span className="group-toggle" onClick={() => handleGroupToggle(l.path)}>
                        {collapsed ? '▶' : '▼'}
                      </span>
                      <span className="layer-name" onClick={() => handleGroupToggle(l.path)}>{l.name}</span>
                      {(l.flipX || l.flipY) && (
                        <span className="flip-badge">flip{l.flipX && l.flipY ? 'xy' : l.flipX ? 'x' : 'y'}</span>
                      )}
                    </div>
                  )
                }
                if (!l.canvas) return null
                const isVisible = l.path in visibility ? visibility[l.path] : !l.hidden
                const roles = roleMap[l.path] ?? []
                const ancestorHidden = isAncestorHiddenByVis(l.path, visibility)
                return (
                  <div key={l.path} className={`layer-item leaf${ancestorHidden ? ' dimmed' : ''}`} style={{ paddingLeft: depth * 16 }}>
                    {l.forceVisible ? (
                      <input type="checkbox" checked readOnly disabled />
                    ) : l.isRadio ? (
                      <input
                        type="radio"
                        name={parentPath}
                        checked={isVisible}
                        onChange={() => handleVisibilityToggle(l)}
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => handleVisibilityToggle(l)}
                      />
                    )}
                    <span className="layer-name">{l.name}</span>
                    {(l.flipX || l.flipY) && (
                      <span className="flip-badge">flip{l.flipX && l.flipY ? 'xy' : l.flipX ? 'x' : 'y'}</span>
                    )}
                    <div className="chip-select">
                      {roles.map((roleKey) => (
                        <span key={roleKey} className="chip">
                          {ROLE_LABELS[roleKey]}
                          <button
                            className="chip-remove"
                            onClick={() => handleRoleToggle(l.path, roleKey)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {roles.length < ALL_ROLE_KEYS.length && (
                        <select
                          className="chip-add-select"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleRoleToggle(l.path, e.target.value)
                          }}
                        >
                          <option value="">+</option>
                          {ALL_ROLE_KEYS.filter((k) => !roles.includes(k)).map((key) => (
                            <option key={key} value={key}>{ROLE_LABELS[key]}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="pane-right">
            <div className="preview-header">
              <div className="settings-section-title">プレビュー</div>
              <label className="animate-toggle">
                <input
                  type="checkbox"
                  checked={previewAnimate}
                  onChange={(e) => setPreviewAnimate(e.target.checked)}
                />
                アニメーション
              </label>
            </div>
            <iframe
              ref={previewRef}
              className="preview-iframe"
              src={previewUrl}
              title="プレビュー"
            />
            <div className="test-speak-row">
              <input
                type="text"
                className="test-speak-input"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="テスト発話テキスト"
                onKeyDown={(e) => { if (e.key === 'Enter') handleTestSpeak() }}
              />
              <button className="settings-btn" onClick={handleTestSpeak}>
                話す
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOICEVOX 設定 */}
      <div className="settings-section">
        <div className="settings-section-title">VOICEVOX 設定</div>
        <div className="settings-row">
          <label className="settings-label">
            API ホスト
            <input
              type="text"
              value={settings.voicevoxHost}
              onChange={(e) => update('voicevoxHost', e.target.value)}
            />
          </label>
          <button className="settings-btn" onClick={handleFetchSpeakers}>
            話者取得
          </button>
        </div>
        {speakersError && <div className="error-text">{speakersError}</div>}
        <label className="settings-label">
          スピーカー
          <select
            value={settings.speaker}
            onChange={(e) => update('speaker', Number(e.target.value))}
          >
            {speakerOptions.length === 0 && (
              <option value={settings.speaker}>ID: {settings.speaker}</option>
            )}
            {speakerOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="settings-label">
          速度
          <input
            type="number"
            min={0.5}
            max={2.0}
            step={0.1}
            value={settings.speed}
            onChange={(e) => update('speed', Number(e.target.value))}
          />
        </label>
        <label className="settings-label">
          音量
          <input
            type="number"
            min={0}
            max={2.0}
            step={0.1}
            value={settings.volume}
            onChange={(e) => update('volume', Number(e.target.value))}
          />
        </label>
      </div>

      {/* 口パクパラメータ */}
      <div className="settings-section">
        <div className="settings-section-title">口パクパラメータ</div>
        <label className="settings-label">
          しきい値 (0〜1)
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={settings.threshold}
            onChange={(e) => update('threshold', Number(e.target.value))}
          />
        </label>
        <label className="settings-label">
          閉口遅延（フレーム数）
          <input
            type="number"
            min={1}
            max={60}
            step={1}
            value={settings.sensitivity}
            onChange={(e) => update('sensitivity', Number(e.target.value))}
          />
        </label>
        <label className="settings-label">
          口パク速度（遷移フレーム数）
          <input
            type="number"
            min={1}
            max={30}
            step={1}
            value={settings.mouthTransitionFrames}
            onChange={(e) => update('mouthTransitionFrames', Number(e.target.value))}
          />
        </label>
      </div>

      {/* 反転設定 */}
      <div className="settings-section">
        <div className="settings-section-title">反転設定 (:flip レイヤー)</div>
        <label className="settings-label settings-label-row">
          <input
            type="checkbox"
            checked={Boolean(settings.flipX)}
            onChange={(e) => update('flipX', e.target.checked ? 1 : 0)}
          />
          左右反転 (:flipx レイヤーを表示)
        </label>
        <label className="settings-label settings-label-row">
          <input
            type="checkbox"
            checked={Boolean(settings.flipY)}
            onChange={(e) => update('flipY', e.target.checked ? 1 : 0)}
          />
          上下反転 (:flipy レイヤーを表示)
        </label>
      </div>

      {/* 目パチパラメータ */}
      <div className="settings-section">
        <div className="settings-section-title">目パチパラメータ</div>
        <label className="settings-label">
          目パチ間隔（秒）
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={settings.blinkInterval}
            onChange={(e) => update('blinkInterval', Number(e.target.value))}
          />
        </label>
        <label className="settings-label">
          目パチ速度（遷移フレーム数）
          <input
            type="number"
            min={1}
            max={30}
            step={1}
            value={settings.blinkSpeed}
            onChange={(e) => update('blinkSpeed', Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  )
}
