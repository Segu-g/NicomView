import { useEffect, useState, useCallback } from 'react'
import type { PluginSettings, PluginSettingsMessage } from '../../shared/types'

interface Props {
  pluginId: string
}

export function Settings({ pluginId }: Props) {
  const [fontSize, setFontSize] = useState('')
  const [theme, setTheme] = useState('dark')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as PluginSettingsMessage
      if (msg?.type === 'nicomview:settings-init') {
        const s = msg.settings
        if (s.fontSize != null) setFontSize(String(s.fontSize))
        if (s.theme != null) setTheme(String(s.theme))
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

  const handleFontSizeChange = (value: string) => {
    setFontSize(value)
    const settings: PluginSettings = { theme }
    if (value) settings.fontSize = Number(value)
    sendUpdate(settings)
  }

  const handleThemeChange = (value: string) => {
    setTheme(value)
    const settings: PluginSettings = { theme: value }
    if (fontSize) settings.fontSize = Number(fontSize)
    sendUpdate(settings)
  }

  if (!ready) return null

  return (
    <div className="settings-form">
      <label className="settings-label">
        フォントサイズ (px)
        <input
          type="number"
          min={1}
          value={fontSize}
          placeholder="28"
          onChange={(e) => handleFontSizeChange(e.target.value)}
        />
      </label>
      <label className="settings-label">
        テーマ
        <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
          <option value="dark">ダーク</option>
          <option value="light">ライト</option>
        </select>
      </label>
    </div>
  )
}
