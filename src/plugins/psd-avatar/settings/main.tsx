import { createRoot } from 'react-dom/client'
import { Settings } from './Settings'
import './styles.css'

const params = new URLSearchParams(location.search)
const pluginId = params.get('pluginId') ?? 'psd-avatar'

createRoot(document.getElementById('root')!).render(
  <Settings pluginId={pluginId} />
)
