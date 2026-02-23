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

type CardType = 'comment' | 'operator' | 'gift' | 'notification' | 'emotion'

interface CardData {
  id: number
  username: string
  content: string
  iconUrl?: string
  type: CardType
  exiting: boolean
}

let nextId = 0

export function CommentCards() {
  const [cards, setCards] = useState<CardData[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const getDuration = () => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--duration').trim()
    return parseFloat(val) * 1000 || 60000
  }

  const markExiting = useCallback((cardId: number) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, exiting: true } : c)))
  }, [])

  const removeCard = useCallback((cardId: number) => {
    timersRef.current.delete(cardId)
    setCards((prev) => prev.filter((c) => c.id !== cardId))
  }, [])

  const scheduleExit = useCallback(
    (cardId: number, delay: number) => {
      const timer = setTimeout(() => markExiting(cardId), delay)
      timersRef.current.set(cardId, timer)
    },
    [markExiting],
  )

  const pushCard = useCallback(
    (card: Omit<CardData, 'id' | 'exiting'>, isHistory?: boolean) => {
      if (isHistory) return
      const id = nextId++
      setCards((prev) => [{ ...card, id, exiting: false }, ...prev])
      scheduleExit(id, getDuration())
    },
    [scheduleExit],
  )

  useCommentEvents({
    onComment: useCallback((data: CommentData) => {
      pushCard({
        username: data.userName || '匿名',
        content: data.content || '',
        iconUrl: data.userIcon,
        type: 'comment',
      }, data.isHistory)
    }, [pushCard]),

    onOperatorComment: useCallback((data: OperatorCommentData) => {
      pushCard({
        username: '運営',
        content: data.content || '',
        type: 'operator',
      }, data.isHistory)
    }, [pushCard]),

    onGift: useCallback((data: GiftData) => {
      const label = (data.itemName || 'ギフト') + (data.point ? ` ${data.point}pt` : '')
      pushCard({
        username: data.userName || '匿名',
        content: label,
        iconUrl: data.userIcon,
        type: 'gift',
      }, data.isHistory)
    }, [pushCard]),

    onNotification: useCallback((data: NotificationData) => {
      pushCard({
        username: '通知',
        content: data.message || '',
        type: 'notification',
      }, data.isHistory)
    }, [pushCard]),

    onEmotion: useCallback((data: EmotionData) => {
      pushCard({
        username: 'エモーション',
        content: data.content || data.id || '',
        type: 'emotion',
      }, data.isHistory)
    }, [pushCard]),

    onClear: useCallback(() => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
      setCards([])
    }, []),
  })

  const handleAnimationEnd = useCallback(
    (cardId: number, e: React.AnimationEvent) => {
      if (e.animationName === 'slotCollapse') {
        removeCard(cardId)
      }
    },
    [removeCard],
  )

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  return (
    <div className="card-container">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`card-slot${card.exiting ? ' exiting' : ''}`}
          onAnimationEnd={(e) => handleAnimationEnd(card.id, e)}
        >
          <div className={`card ${card.type}`}>
            {card.iconUrl ? (
              <img className="avatar" src={card.iconUrl} alt="" />
            ) : (
              <div className="avatar placeholder" />
            )}
            <div className="card-body">
              <div className="username">{card.username}</div>
              <div className="content">{card.content}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
