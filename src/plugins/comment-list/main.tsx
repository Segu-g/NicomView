import { createRoot } from 'react-dom/client'
import { CommentList } from './CommentList'

const params = new URLSearchParams(location.search)

const fontSize = params.get('fontSize')
if (fontSize) {
  document.documentElement.style.setProperty('--font-size', fontSize + 'px')
}

const theme = params.get('theme')
if (theme) {
  document.documentElement.dataset.theme = theme
}

const direction = params.get('direction')
if (direction) {
  document.documentElement.dataset.direction = direction
}

createRoot(document.getElementById('root')!).render(<CommentList />)
