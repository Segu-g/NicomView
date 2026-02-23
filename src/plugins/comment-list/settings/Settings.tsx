import { useEffect, useState, useCallback } from 'react'
import type { PluginSettings, PluginSettingsMessage } from '../../../shared/types'

const DEFAULTS = { fontSize: 28, theme: 'dark', direction: 'bottom' }

interface Props {
  pluginId: string
}

export function Settings({ pluginId }: Props) {
  const [fontSize, setFontSize] = useState(String(DEFAULTS.fontSize))
  const [theme, setTheme] = useState(DEFAULTS.theme)
  const [direction, setDirection] = useState(DEFAULTS.direction)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as PluginSettingsMessage
      if (msg?.type === 'nicomview:settings-init') {
        const s = msg.settings
        setFontSize(String(s.fontSize ?? DEFAULTS.fontSize))
        setTheme(String(s.theme ?? DEFAULTS.theme))
        setDirection(String(s.direction ?? DEFAULTS.direction))
        setReady(true)
      }
    }
    window.addEventListener('message', handler)
    window.parent.postMessage({ type: 'nicomview:ready', pluginId }, '*')
    return () => window.removeEventListener('message', handler)
  }, [pluginId])

  const sendUpdate = useCallback(
    (settings: PluginSettings) => {
      window.parent.postMessage(
        { type: 'nicomview:settings-update', pluginId, settings },
        '*'
      )
    },
    [pluginId]
  )

  const buildAndSend = useCallback(
    (overrides: Partial<Record<string, string | number>>) => {
      const settings: PluginSettings = {
        fontSize: Number(fontSize),
        theme,
        direction,
        ...overrides,
      }
      sendUpdate(settings)
    },
    [fontSize, theme, direction, sendUpdate]
  )

  if (!ready) return null

  return (
    <div className="settings-form">
      <label className="settings-label">
        フォントサイズ (px)
        <input
          type="number"
          min={1}
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value)
            buildAndSend({ fontSize: Number(e.target.value) || undefined })
          }}
        />
      </label>
      <label className="settings-label">
        テーマ
        <select value={theme} onChange={(e) => { setTheme(e.target.value); buildAndSend({ theme: e.target.value }) }}>
          <option value="dark">ダーク</option>
          <option value="light">ライト</option>
        </select>
      </label>
      <label className="settings-label">
        表示方向
        <select value={direction} onChange={(e) => { setDirection(e.target.value); buildAndSend({ direction: e.target.value }) }}>
          <option value="bottom">下から（デフォルト）</option>
          <option value="top">上から</option>
        </select>
      </label>
    </div>
  )
}
