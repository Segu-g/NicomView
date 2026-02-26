import { useEffect, useState, useCallback } from 'react'
import type { PluginSettings, PluginSettingsMessage } from '../../../shared/types'
import { loadPsd, type PsdData } from '../psdLoader'
import { fetchSpeakers, type VoicevoxSpeaker } from '../voicevoxClient'

const DEFAULTS = {
  psdFile: 'models/default.psd',
  voicevoxHost: 'http://localhost:50021',
  speaker: 0,
  speed: 1.0,
  volume: 1.0,
  threshold: 0.15,
  sensitivity: 3,
  blinkInterval: 3,
  blinkSpeed: 6,
  mouth0: '', mouth1: '', mouth2: '', mouth3: '', mouth4: '',
  eye0: '', eye1: '', eye2: '', eye3: '', eye4: '',
}

const MOUTH_LABELS = ['閉じ', 'ほぼ閉じ', '半開き', 'ほぼ開き', '開き']
const EYE_LABELS = ['開き', 'ほぼ開き', '半開き', 'ほぼ閉じ', '閉じ']

interface Props {
  pluginId: string
}

export function Settings({ pluginId }: Props) {
  const [settings, setSettings] = useState<Record<string, string | number>>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [psd, setPsd] = useState<PsdData | null>(null)
  const [psdError, setPsdError] = useState<string | null>(null)
  const [psdLoading, setPsdLoading] = useState(false)
  const [speakers, setSpeakers] = useState<VoicevoxSpeaker[]>([])
  const [speakersError, setSpeakersError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as PluginSettingsMessage
      if (msg?.type === 'nicomview:settings-init') {
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
        '*'
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

  // Fetch speakers on mount when ready
  useEffect(() => {
    if (ready) handleFetchSpeakers()
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null

  const leafPaths = psd
    ? psd.layers.filter((l) => !l.isGroup && l.canvas !== null).map((l) => l.path)
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
        {psd && <div className="success-text">{psd.width}x{psd.height} — {leafPaths.length} レイヤー</div>}
        {psd && (
          <div className="layer-tree">
            {psd.layers.map((l) => (
              <div key={l.path} className={`layer-item${l.isGroup ? ' group' : ''}`}>
                {'　'.repeat(l.path.split('/').length - 1)}
                {l.isGroup ? '📁 ' : '🖼 '}
                {l.path}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 口パクレイヤー */}
      <div className="settings-section">
        <div className="settings-section-title">口パクレイヤー（5段階）</div>
        {MOUTH_LABELS.map((label, i) => (
          <label key={i} className="settings-label">
            {label}
            <select
              value={settings[`mouth${i}`]}
              onChange={(e) => update(`mouth${i}`, e.target.value)}
            >
              <option value="">（未設定）</option>
              {leafPaths.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* 目パチレイヤー */}
      <div className="settings-section">
        <div className="settings-section-title">目パチレイヤー（5段階）</div>
        {EYE_LABELS.map((label, i) => (
          <label key={i} className="settings-label">
            {label}
            <select
              value={settings[`eye${i}`]}
              onChange={(e) => update(`eye${i}`, e.target.value)}
            >
              <option value="">（未設定）</option>
              {leafPaths.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

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
          感度（移動平均フレーム数）
          <input
            type="number"
            min={1}
            max={30}
            step={1}
            value={settings.sensitivity}
            onChange={(e) => update('sensitivity', Number(e.target.value))}
          />
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
