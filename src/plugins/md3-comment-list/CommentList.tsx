import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import './styles.css'

const WS_URL = 'ws://localhost:3940'
const MAX_COMMENTS = 200
const SCROLL_THRESHOLD = 50

interface CommentData {
  content?: string
  message?: string
  userName?: string
  userId?: string
  userIcon?: string
  itemName?: string
  point?: number
  id?: string
  isHistory?: boolean
}

interface CommentEntry {
  key: number
  eventType: string
  data: CommentData
}

function UserIcon({ src }: { src?: string }) {
  if (!src) return null
  return <img className="user-icon" src={src} alt="" />
}

function CommentItem({ entry }: { entry: CommentEntry }) {
  const { eventType, data } = entry

  switch (eventType) {
    case 'comment': {
      const name = data.userName || '匿名'
      return (
        <div className={`comment-item${data.isHistory ? ' history' : ''}`}>
          <UserIcon src={data.userIcon} />
          <div className="comment-body">
            <span className="username">{name}</span>
            <span className="content">{data.content || ''}</span>
          </div>
        </div>
      )
    }

    case 'gift': {
      const giftName = data.userName || '匿名'
      const label = (data.itemName || 'ギフト') + (data.point ? ` ${data.point}pt` : '')
      return (
        <div className={`comment-item gift${data.isHistory ? ' history' : ''}`}>
          <UserIcon src={data.userIcon} />
          <div className="comment-body">
            <span className="icon">🎁</span>
            <span className="content">{giftName}</span>
            <span className="chip">{label}</span>
          </div>
        </div>
      )
    }

    case 'notification':
      return (
        <div className={`comment-item notification${data.isHistory ? ' history' : ''}`}>
          <div className="comment-body">
            <span className="icon">ℹ️</span>
            <span className="content">{data.message || JSON.stringify(data)}</span>
          </div>
        </div>
      )

    case 'operatorComment':
      return (
        <div className={`comment-item operator${data.isHistory ? ' history' : ''}`}>
          <div className="comment-body">
            <span className="icon">📢</span>
            <span className="content">{data.content || JSON.stringify(data)}</span>
          </div>
        </div>
      )

    case 'emotion':
      return (
        <div className={`comment-item emotion${data.isHistory ? ' history' : ''}`}>
          <div className="comment-body">
            <span className="icon">😄</span>
            <span className="content">{data.content || data.id || 'エモーション'}</span>
          </div>
        </div>
      )

    default:
      return null
  }
}

export function CommentList() {
  const [comments, setComments] = useState<CommentEntry[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const nextKey = useRef(0)

  const handleMessage = useCallback((event: string, data: unknown) => {
    const validEvents = ['comment', 'gift', 'notification', 'operatorComment', 'emotion']
    if (!validEvents.includes(event)) return

    const key = nextKey.current++
    setComments((prev) => {
      const next = [...prev, { key, eventType: event, data: data as CommentData }]
      return next.length > MAX_COMMENTS ? next.slice(next.length - MAX_COMMENTS) : next
    })
  }, [])

  useWebSocket(WS_URL, handleMessage)

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
  }, [])

  useEffect(() => {
    if (autoScrollRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments])

  return (
    <div id="comment-list" ref={listRef} onScroll={handleScroll}>
      {comments.map((entry) => (
        <CommentItem key={entry.key} entry={entry} />
      ))}
    </div>
  )
}
