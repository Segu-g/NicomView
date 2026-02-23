import { createRoot } from 'react-dom/client'
import { Settings } from './Settings'
import './settings.css'

const params = new URLSearchParams(location.search)
const pluginId = params.get('pluginId') ?? 'comment-cards'

createRoot(document.getElementById('root')!).render(
  <Settings pluginId={pluginId} />
)
