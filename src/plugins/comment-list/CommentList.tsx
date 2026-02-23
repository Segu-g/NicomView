import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useCommentEvents,
  type CommentData,
  type GiftData,
  type NotificationData,
  type OperatorCommentData,
  type EmotionData,
} from '../hooks/useCommentEvents'
import './styles.css'

const MAX_COMMENTS = 200
const SCROLL_THRESHOLD = 50

type EntryData = CommentData | GiftData | NotificationData | OperatorCommentData | EmotionData

interface CommentEntry {
  key: number
  eventType: string
  data: EntryData
}

function UserIcon({ src }: { src?: string }) {
  if (!src) return null
  return <img className="user-icon" src={src} alt="" />
}

function CommentItem({ entry }: { entry: CommentEntry }) {
  const { eventType, data } = entry

  switch (eventType) {
    case 'comment': {
      const d = data as CommentData
      const name = d.userName || '匿名'
      return (
        <div className={`comment-item${d.isHistory ? ' history' : ''}`}>
          <UserIcon src={d.userIcon} />
          <div className="comment-body">
            <span className="username">{name}</span>
            <span className="content">{d.content || ''}</span>
          </div>
        </div>
      )
    }

    case 'gift': {
      const d = data as GiftData
      const giftName = d.userName || '匿名'
      const label = (d.itemName || 'ギフト') + (d.point ? ` ${d.point}pt` : '')
      return (
        <div className={`comment-item gift${d.isHistory ? ' history' : ''}`}>
          <UserIcon src={d.userIcon} />
          <div className="comment-body">
            <span className="icon">🎁</span>
            <span className="content">{giftName}</span>
            <span className="chip">{label}</span>
          </div>
        </div>
      )
    }

    case 'notification': {
      const d = data as NotificationData
      return (
        <div className={`comment-item notification${d.isHistory ? ' history' : ''}`}>
          <div className="comment-body">
            <span className="icon">ℹ️</span>
            <span className="content">{d.message || JSON.stringify(d)}</span>
          </div>
        </div>
      )
    }

    case 'operatorComment': {
      const d = data as OperatorCommentData
      return (
        <div className={`comment-item operator${d.isHistory ? ' history' : ''}`}>
          <div className="comment-body">
            <span className="icon">📢</span>
            <span className="content">{d.content || JSON.stringify(d)}</span>
          </div>
        </div>
      )
    }

    case 'emotion': {
      const d = data as EmotionData
      return (
        <div className={`comment-item emotion${d.isHistory ? ' history' : ''}`}>
          <div className="comment-body">
            <span className="icon">😄</span>
            <span className="content">{d.content || d.id || 'エモーション'}</span>
          </div>
        </div>
      )
    }

    default:
      return null
  }
}

export function CommentList() {
  const [comments, setComments] = useState<CommentEntry[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const nextKey = useRef(0)

  const addEntry = useCallback((eventType: string, data: EntryData) => {
    const key = nextKey.current++
    const entry = { key, eventType, data }
    setComments((prev) => {
      const next = data.isHistory ? [entry, ...prev] : [...prev, entry]
      return next.length > MAX_COMMENTS ? next.slice(next.length - MAX_COMMENTS) : next
    })
  }, [])

  useCommentEvents({
    onComment: useCallback((data: CommentData) => addEntry('comment', data), [addEntry]),
    onGift: useCallback((data: GiftData) => addEntry('gift', data), [addEntry]),
    onNotification: useCallback((data: NotificationData) => addEntry('notification', data), [addEntry]),
    onOperatorComment: useCallback((data: OperatorCommentData) => addEntry('operatorComment', data), [addEntry]),
    onEmotion: useCallback((data: EmotionData) => addEntry('emotion', data), [addEntry]),
    onClear: useCallback(() => setComments([]), []),
  })

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
