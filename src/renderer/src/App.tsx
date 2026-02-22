import { useState, useEffect, useCallback } from 'react'
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
  ListItemText
} from '@mui/material'
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material'
import type {
  ConnectionState,
  PluginDescriptor,
  PluginPreferences
} from '../../shared/types'
import { ALL_EVENT_TYPES } from '../../shared/types'
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

function App(): JSX.Element {
  const [liveId, setLiveId] = useState('')
  const [cookies, setCookies] = useState('')
  const [showCookies, setShowCookies] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([])
  const [preferences, setPreferences] = useState<PluginPreferences>(defaultPreferences)
  const [pluginsLoaded, setPluginsLoaded] = useState(false)
  const [fontSizes, setFontSizes] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsubscribe = window.commentViewerAPI.onStateChange((state: ConnectionState) => {
      setConnectionState(state)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    Promise.all([
      window.commentViewerAPI.getPlugins(),
      window.commentViewerAPI.getPluginPreferences()
    ]).then(([loadedPlugins, loadedPrefs]) => {
      setPlugins(loadedPlugins)
      setPreferences(loadedPrefs)
      setPluginsLoaded(true)
    })
  }, [])

  const handleConnect = useCallback(async () => {
    if (!liveId.trim()) return
    await window.commentViewerAPI.connect(liveId.trim(), cookies || undefined)
  }, [liveId, cookies])

  const handleDisconnect = useCallback(async () => {
    await window.commentViewerAPI.disconnect()
  }, [])

  const buildPluginUrl = useCallback((pluginId: string) => {
    const base = `${BASE_URL}/plugins/${pluginId}/overlay/`
    const fs = fontSizes[pluginId]
    return fs ? `${base}?fontSize=${fs}` : base
  }, [fontSizes])

  const handleCopyUrl = useCallback(async (pluginId: string) => {
    await navigator.clipboard.writeText(buildPluginUrl(pluginId))
    setCopiedId(pluginId)
    setTimeout(() => setCopiedId(null), 2000)
  }, [buildPluginUrl])

  const handlePreferencesChange = useCallback(
    async (partial: Partial<PluginPreferences>) => {
      const updated = { ...preferences, ...partial }
      setPreferences(updated)
      await window.commentViewerAPI.setPluginPreferences(partial)
    },
    [preferences]
  )

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
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              表示プラグイン
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              以下のURLをOBSブラウザソースやブラウザで開くとコメントが表示されます
            </Typography>
            <List dense disablePadding>
              {plugins.filter((p) => p.overlay).map((plugin) => (
                <ListItem key={plugin.id} sx={{ px: 0, flexWrap: 'wrap' }}>
                  <ListItemText
                    primary={plugin.name}
                    secondary={buildPluginUrl(plugin.id)}
                    secondaryTypographyProps={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      size="small"
                      label="fontSize"
                      type="number"
                      placeholder={plugin.defaultFontSize != null ? String(plugin.defaultFontSize) : ''}
                      value={fontSizes[plugin.id] ?? ''}
                      onChange={(e) =>
                        setFontSizes((prev) => ({ ...prev, [plugin.id]: e.target.value }))
                      }
                      slotProps={{ htmlInput: { min: 1 } }}
                      sx={{ width: 100 }}
                    />
                    <Tooltip title={copiedId === plugin.id ? 'コピーしました' : 'URLをコピー'}>
                      <IconButton onClick={() => handleCopyUrl(plugin.id)} size="small">
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {pluginsLoaded && (
          <Card variant="outlined">
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
      </Container>
    </ThemeProvider>
  )
}

export default App
