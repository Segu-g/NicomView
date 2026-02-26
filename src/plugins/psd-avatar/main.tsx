import { createRoot } from 'react-dom/client'
import { PsdAvatar } from './PsdAvatar'

const params = new URLSearchParams(location.search)

const props = {
  psdFile: params.get('psdFile') || 'models/default.psd',
  voicevoxHost: params.get('voicevoxHost') || 'http://localhost:50021',
  speaker: Number(params.get('speaker')) || 0,
  speed: Number(params.get('speed')) || 1.0,
  volume: Number(params.get('volume')) || 1.0,
  mouth: [
    params.get('mouth0') || '',
    params.get('mouth1') || '',
    params.get('mouth2') || '',
    params.get('mouth3') || '',
    params.get('mouth4') || '',
  ],
  eye: [
    params.get('eye0') || '',
    params.get('eye1') || '',
    params.get('eye2') || '',
    params.get('eye3') || '',
    params.get('eye4') || '',
  ],
  threshold: Number(params.get('threshold')) || 0.15,
  sensitivity: Number(params.get('sensitivity')) || 3,
  blinkInterval: Number(params.get('blinkInterval')) || 3,
  blinkSpeed: Number(params.get('blinkSpeed')) || 6,
}

createRoot(document.getElementById('root')!).render(<PsdAvatar {...props} />)
