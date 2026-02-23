import { createRoot } from 'react-dom/client'
import { CommentList } from './CommentList'

const fontSize = new URLSearchParams(location.search).get('fontSize')
if (fontSize) {
  document.documentElement.style.setProperty('--font-size', fontSize + 'px')
}

createRoot(document.getElementById('root')!).render(<CommentList />)
