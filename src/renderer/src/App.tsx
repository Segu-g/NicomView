import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Slider,
  FormGroup,
  Checkbox,
  Snackbar
} from '@mui/material'
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Settings as SettingsIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material'
import type {
  ConnectionState,
  CommentEventType,
  PluginDescriptor,
  PluginPreferences,
  PluginSettings,
  PluginSettingsMessage,
  TtsSettings,
  TtsAdapterInfo,
  TtsAdapterParamDef
} from '../../shared/types'
import { ALL_EVENT_TYPES, DEFAULT_TTS_TEMPLATES } from '../../shared/types'
import EventFilter from './components/EventFilter'

const theme = createTheme({
  colorSchemes: {
    dark: true
  },
  cssVariables: {
    colorSchemeSelector: 'class'
  },
  shape: {
    borderRadius: 16
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Roboto", sans-serif'
  }
})

const stateLabels: Record<ConnectionState, string> = {
  disconnected: '未接続',
  connecting: '接続中...',
  connected: '接続済み',
  error: 'エラー'
}

const stateColors: Record<ConnectionState, 'default' | 'warning' | 'success' | 'error'> = {
  disconnected: 'default',
  connecting: 'warning',
  connected: 'success',
  error: 'error'
}

const defaultPreferences: PluginPreferences = {
  enabledEvents: [...ALL_EVENT_TYPES]
}

const BASE_URL = 'http://localhost:3939'

const templatePlaceholders: Record<CommentEventType, string> = {
  comment: '{userName}, {content}',
  gift: '{userName}, {itemName}, {point}',
  emotion: '{content}',
  notification: '{message}',
  operatorComment: '{content}, {name}'
}

function App(): JSX.Element {
  const [liveId, setLiveId] = useState('')
  const [cookies, setCookies] = useState('')
  const [showCookies, setShowCookies] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([])
  const [preferences, setPreferences] = useState<PluginPreferences>(defaultPreferences)
  const [pluginsLoaded, setPluginsLoaded] = useState(false)
  const [pluginSettings, setPluginSettings] = useState<Record<string, PluginSettings>>({})
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null)
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({})
  const [ttsSettings, setTtsSettings] = useState<TtsSettings | null>(null)
  const [ttsAdapters, setTtsAdapters] = useState<TtsAdapterInfo[]>([])
  const [ttsParamDefs, setTtsParamDefs] = useState<TtsAdapterParamDef[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showEngineSettings, setShowEngineSettings] = useState(true)
  const [showEventSettings, setShowEventSettings] = useState(false)
  const [showAudioSettings, setShowAudioSettings] = useState(false)

  useEffect(() => {
    const unsubscribe = window.commentViewerAPI.onStateChange((state: ConnectionState) => {
      setConnectionState(state)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    Promise.all([
      window.commentViewerAPI.getPlugins(),
      window.commentViewerAPI.getPluginPreferences(),
      window.commentViewerAPI.getTtsSettings(),
      window.commentViewerAPI.getTtsAdapters()
    ]).then(async ([loadedPlugins, loadedPrefs, loadedTts, loadedAdapters]) => {
      setPlugins(loadedPlugins)
      setPreferences(loadedPrefs)
      setTtsSettings(loadedTts)
      setTtsAdapters(loadedAdapters)

      const settings: Record<string, PluginSettings> = {}
      for (const p of loadedPlugins) {
        settings[p.id] = await window.commentViewerAPI.getPluginSettings(p.id)
      }
      setPluginSettings(settings)
      setPluginsLoaded(true)

      // 保存済みアダプターのパラメーター定義を読み込む
      if (loadedTts.adapterId) {
        window.commentViewerAPI.getTtsAdapterParams(loadedTts.adapterId).then(setTtsParamDefs)
      }
    })
  }, [])

  // postMessage listener
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as PluginSettingsMessage
      if (!msg?.type) return

      if (msg.type === 'nicomview:ready') {
        const { pluginId } = msg
        const settings = pluginSettings[pluginId] ?? {}
        const source = e.source as Window | null
        source?.postMessage(
          { type: 'nicomview:settings-init', settings } satisfies PluginSettingsMessage,
          '*'
        )
      }

      if (msg.type === 'nicomview:settings-update') {
        const { pluginId, settings } = msg
        setPluginSettings((prev) => ({ ...prev, [pluginId]: settings }))
        window.commentViewerAPI.setPluginSettings(pluginId, settings).catch(() => {
          setSaveError('プラグイン設定の保存に失敗しました')
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [pluginSettings])

  const handleConnect = useCallback(async () => {
    if (!liveId.trim()) return
    await window.commentViewerAPI.connect(liveId.trim(), cookies || undefined)
  }, [liveId, cookies])

  const handleDisconnect = useCallback(async () => {
    await window.commentViewerAPI.disconnect()
  }, [])

  const buildPluginUrl = useCallback((pluginId: string) => {
    const base = `${BASE_URL}/plugins/${pluginId}/overlay/`
    const params = new URLSearchParams()
    const settings = pluginSettings[pluginId]
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        if (value !== '' && value != null) params.set(key, String(value))
      }
    }
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }, [pluginSettings])

  const handleCopyUrl = useCallback(async (pluginId: string) => {
    await navigator.clipboard.writeText(buildPluginUrl(pluginId))
    setCopiedId(pluginId)
    setTimeout(() => setCopiedId(null), 2000)
  }, [buildPluginUrl])

  const handlePreferencesChange = useCallback(
    async (partial: Partial<PluginPreferences>) => {
      const prev = preferences
      const updated = { ...preferences, ...partial }
      setPreferences(updated)
      try {
        await window.commentViewerAPI.setPluginPreferences(partial)
      } catch {
        setPreferences(prev)
        setSaveError('表示イベント設定の保存に失敗しました')
      }
    },
    [preferences]
  )

  const handleTtsChange = useCallback(
    async (partial: Partial<TtsSettings>) => {
      if (!ttsSettings) return
      const prev = ttsSettings
      const updated = { ...ttsSettings, ...partial }
      setTtsSettings(updated)
      try {
        await window.commentViewerAPI.setTtsSettings(partial)
        // アダプター変更時はパラメーター定義を再取得
        if (partial.adapterId !== undefined) {
          if (partial.adapterId) {
            const defs = await window.commentViewerAPI.getTtsAdapterParams(partial.adapterId)
            setTtsParamDefs(defs)
          } else {
            setTtsParamDefs([])
          }
        }
      } catch {
        setTtsSettings(prev)
        setSaveError('読み上げ設定の保存に失敗しました')
      }
    },
    [ttsSettings]
  )

  const toggleExpanded = useCallback((pluginId: string) => {
    setExpandedPlugin((prev) => (prev === pluginId ? null : pluginId))
  }, [])

  const speakerOptions = ttsParamDefs.find((p) => p.key === 'speakerId')?.options ?? []

  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          NicomView
        </Typography>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                接続状態
              </Typography>
              <Chip
                label={stateLabels[connectionState]}
                color={stateColors[connectionState]}
                size="small"
              />
            </Box>

            <TextField
              fullWidth
              label="放送ID"
              placeholder="lv123456789"
              value={liveId}
              onChange={(e) => setLiveId(e.target.value)}
              disabled={isConnected || isConnecting}
              sx={{ mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                onClick={() => setShowCookies(!showCookies)}
                endIcon={showCookies ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                Cookieオプション
              </Button>
              <Collapse in={showCookies}>
                <TextField
                  fullWidth
                  label="Cookie（ログイン視聴用）"
                  placeholder="user_session=..."
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  disabled={isConnected || isConnecting}
                  multiline
                  rows={2}
                  sx={{ mt: 1 }}
                />
              </Collapse>
            </Box>

            {isConnected ? (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleDisconnect}
              >
                切断
              </Button>
            ) : (
              <Button
                variant="contained"
                fullWidth
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? '接続中...' : '接続'}
              </Button>
            )}
          </CardContent>
        </Card>

        {connectionState === 'error' && (
          <Alert severity="error" sx={{ mb: 3 }}>
            接続エラーが発生しました。放送IDを確認してください。
          </Alert>
        )}

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="subtitle2" color="text.secondary">
                表示プラグイン
              </Typography>
              <Tooltip title="プラグインフォルダを開く">
                <IconButton size="small" onClick={() => window.commentViewerAPI.openPluginFolder()}>
                  <FolderOpenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              以下のURLをOBSブラウザソースやブラウザで開くとコメントが表示されます
            </Typography>
            <List dense disablePadding>
              {plugins.filter((p) => p.overlay).map((plugin) => (
                <ListItem key={plugin.id} sx={{ px: 0, flexDirection: 'column', alignItems: 'stretch' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ListItemText
                      primary={plugin.name}
                      secondary={buildPluginUrl(plugin.id)}
                      secondaryTypographyProps={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {plugin.settings && (
                        <Tooltip title="設定">
                          <IconButton
                            onClick={() => {
                              if (plugin.settingsPopup) {
                                window.open(
                                  `${BASE_URL}/plugins/${plugin.id}/settings/?pluginId=${plugin.id}`,
                                  `nicomview-settings-${plugin.id}`
                                )
                              } else {
                                toggleExpanded(plugin.id)
                              }
                            }}
                            size="small"
                            data-testid={`settings-toggle-${plugin.id}`}
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={copiedId === plugin.id ? 'コピーしました' : 'URLをコピー'}>
                        <IconButton onClick={() => handleCopyUrl(plugin.id)} size="small">
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  {plugin.settings && !plugin.settingsPopup && (
                    <Collapse in={expandedPlugin === plugin.id}>
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <iframe
                          ref={(el) => { iframeRefs.current[plugin.id] = el }}
                          src={`${BASE_URL}/plugins/${plugin.id}/settings/?pluginId=${plugin.id}`}
                          title={`${plugin.name} 設定`}
                          data-testid={`settings-iframe-${plugin.id}`}
                          style={{
                            width: '100%',
                            height: 200,
                            border: 'none',
                            borderRadius: 8,
                            background: '#1e1e1e'
                          }}
                        />
                      </Box>
                    </Collapse>
                  )}
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {pluginsLoaded && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                表示イベント
              </Typography>
              <EventFilter
                preferences={preferences}
                onPreferencesChange={handlePreferencesChange}
              />
            </CardContent>
          </Card>
        )}

        {ttsSettings && (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  読み上げ設定
                </Typography>
                <Switch
                  size="small"
                  checked={ttsSettings.enabled}
                  onChange={(e) => handleTtsChange({ enabled: e.target.checked })}
                  inputProps={{ 'aria-label': '読み上げ有効' }}
                />
              </Box>

              <Box
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 0.5 }}
                onClick={() => setShowEngineSettings(!showEngineSettings)}
              >
                <Typography variant="caption" color="text.secondary">
                  エンジン設定
                </Typography>
                {showEngineSettings ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </Box>
              <Collapse in={showEngineSettings}>
              {ttsAdapters.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    読み上げエンジン
                  </Typography>
                  <Select
                    fullWidth
                    size="small"
                    value={ttsSettings.adapterId}
                    onChange={(e) => handleTtsChange({ adapterId: e.target.value })}
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      選択してください
                    </MenuItem>
                    {ttsAdapters.map((adapter) => (
                      <MenuItem key={adapter.id} value={adapter.id}>
                        {adapter.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              )}

              {ttsParamDefs.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  {ttsParamDefs.map((param) => {
                    const value = ttsSettings.adapterSettings[param.key] ?? param.defaultValue
                    if (param.type === 'select') {
                      return (
                        <Box key={param.key} sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {param.label}
                          </Typography>
                          <Select
                            fullWidth
                            size="small"
                            value={value}
                            onChange={(e) => {
                              handleTtsChange({
                                adapterSettings: { ...ttsSettings.adapterSettings, [param.key]: e.target.value }
                              })
                            }}
                          >
                            {(param.options ?? []).map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {param.options?.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                              エンジンが起動していません
                            </Typography>
                          )}
                        </Box>
                      )
                    }
                    if (param.type === 'number') {
                      return (
                        <Box key={param.key} sx={{ mb: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label={param.label}
                            type="number"
                            value={value}
                            inputProps={{ min: param.min, max: param.max, step: param.step }}
                            onChange={(e) => {
                              handleTtsChange({
                                adapterSettings: { ...ttsSettings.adapterSettings, [param.key]: Number(e.target.value) }
                              })
                            }}
                          />
                        </Box>
                      )
                    }
                    // string
                    return (
                      <Box key={param.key} sx={{ mb: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label={param.label}
                          value={value}
                          onChange={(e) => {
                            handleTtsChange({
                              adapterSettings: { ...ttsSettings.adapterSettings, [param.key]: e.target.value }
                            })
                          }}
                        />
                      </Box>
                    )
                  })}
                </Box>
              )}
              </Collapse>

              <Box
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 0.5 }}
                onClick={() => setShowEventSettings(!showEventSettings)}
              >
                <Typography variant="caption" color="text.secondary">
                  イベント設定
                </Typography>
                {showEventSettings ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </Box>
              <Collapse in={showEventSettings}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  読み上げ対象イベント
                </Typography>
                {ALL_EVENT_TYPES.map((eventType) => {
                  const enabled = ttsSettings.enabledEvents.includes(eventType)
                  const label = {
                    comment: 'コメント',
                    gift: 'ギフト',
                    emotion: 'エモーション',
                    notification: '通知',
                    operatorComment: '運営コメント'
                  }[eventType]
                  return (
                    <Box key={eventType}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={enabled}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...ttsSettings.enabledEvents, eventType]
                                : ttsSettings.enabledEvents.filter((t: CommentEventType) => t !== eventType)
                              handleTtsChange({ enabledEvents: next })
                            }}
                          />
                        }
                        label={label}
                      />
                      {enabled && (
                        <>
                          <TextField
                            fullWidth
                            size="small"
                            label={`${label}テンプレート`}
                            value={ttsSettings.formatTemplates[eventType] ?? DEFAULT_TTS_TEMPLATES[eventType]}
                            helperText={`使用可能: ${templatePlaceholders[eventType]}`}
                            onChange={(e) => {
                              handleTtsChange({
                                formatTemplates: { ...ttsSettings.formatTemplates, [eventType]: e.target.value }
                              })
                            }}
                            sx={{ mb: 1, ml: 4 }}
                          />
                          {speakerOptions.length > 0 && (
                            <Box sx={{ mb: 1, ml: 4 }}>
                              <Typography variant="caption" color="text.secondary">
                                {label}キャラクター
                              </Typography>
                              <Select
                                fullWidth
                                size="small"
                                value={ttsSettings.speakerOverrides[eventType] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  const next = { ...ttsSettings.speakerOverrides }
                                  if (val === '') {
                                    delete next[eventType]
                                  } else {
                                    next[eventType] = val
                                  }
                                  handleTtsChange({ speakerOverrides: next })
                                }}
                              >
                                <MenuItem value="">デフォルト</MenuItem>
                                {speakerOptions.map((opt) => (
                                  <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  )
                })}
              </Box>
              </Collapse>

              <Box
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 0.5 }}
                onClick={() => setShowAudioSettings(!showAudioSettings)}
              >
                <Typography variant="caption" color="text.secondary">
                  音声調整
                </Typography>
                {showAudioSettings ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </Box>
              <Collapse in={showAudioSettings}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  速度: {ttsSettings.speed.toFixed(1)}
                </Typography>
                <Slider
                  size="small"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={ttsSettings.speed}
                  onChange={(_e, v) => setTtsSettings({ ...ttsSettings, speed: v as number })}
                  onChangeCommitted={(_e, v) => handleTtsChange({ speed: v as number })}
                />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  音量: {ttsSettings.volume.toFixed(1)}
                </Typography>
                <Slider
                  size="small"
                  min={0}
                  max={2.0}
                  step={0.1}
                  value={ttsSettings.volume}
                  onChange={(_e, v) => setTtsSettings({ ...ttsSettings, volume: v as number })}
                  onChangeCommitted={(_e, v) => handleTtsChange({ volume: v as number })}
                />
              </Box>
              </Collapse>
            </CardContent>
          </Card>
        )}
      </Container>
      <Snackbar
        open={saveError !== null}
        autoHideDuration={4000}
        onClose={() => setSaveError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  )
}

export default App
