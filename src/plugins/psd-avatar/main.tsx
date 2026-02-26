import { createRoot } from 'react-dom/client'
import { PsdAvatar } from './PsdAvatar'

const params = new URLSearchParams(location.search)

function parseLayerPaths(value: string | null): string[] {
  if (!value) return []
  if (value.startsWith('[')) {
    try { return JSON.parse(value) as string[] } catch { /* fall through */ }
  }
  return [value] // backward compat: plain path string
}

const props = {
  psdFile: params.get('psdFile') || 'models/default.psd',
  voicevoxHost: params.get('voicevoxHost') || 'http://localhost:50021',
  speaker: Number(params.get('speaker')) || 0,
  speed: Number(params.get('speed')) || 1.0,
  volume: Number(params.get('volume')) || 1.0,
  mouth: [
    parseLayerPaths(params.get('mouth0')),
    parseLayerPaths(params.get('mouth1')),
    parseLayerPaths(params.get('mouth2')),
    parseLayerPaths(params.get('mouth3')),
    parseLayerPaths(params.get('mouth4')),
  ],
  eye: [
    parseLayerPaths(params.get('eye0')),
    parseLayerPaths(params.get('eye1')),
    parseLayerPaths(params.get('eye2')),
    parseLayerPaths(params.get('eye3')),
    parseLayerPaths(params.get('eye4')),
  ],
  threshold: Number(params.get('threshold')) || 0.15,
  sensitivity: Number(params.get('sensitivity')) || 8,
  mouthTransitionFrames: Number(params.get('mouthTransitionFrames')) || 4,
  blinkInterval: Number(params.get('blinkInterval')) || 3,
  blinkSpeed: Number(params.get('blinkSpeed')) || 6,
  layerVisibility: JSON.parse(params.get('layerVisibility') || '{}') as Record<string, boolean>,
  preview: params.get('preview') === 'true',
}

createRoot(document.getElementById('root')!).render(<PsdAvatar {...props} />)
