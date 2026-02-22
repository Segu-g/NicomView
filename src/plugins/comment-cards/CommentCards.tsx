import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import './styles.css'

const WS_URL = 'ws://localhost:3940'

interface CardData {
  id: number
  username: string
  content: string
  iconUrl?: string
  type: 'comment' | 'operator'
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

  const handleMessage = useCallback(
    (event: string, data: unknown) => {
      if (event !== 'comment' && event !== 'operatorComment') return

      const d = data as {
        content?: string
        userName?: string
        userIcon?: string
        isHistory?: boolean
      }

      if (d.isHistory) return

      const id = nextId++
      const card: CardData = {
        id,
        username: d.userName || '匿名',
        content: d.content || '',
        iconUrl: d.userIcon,
        type: event === 'operatorComment' ? 'operator' : 'comment',
        exiting: false,
      }

      setCards((prev) => [card, ...prev])
      scheduleExit(id, getDuration())
    },
    [scheduleExit],
  )

  useWebSocket(WS_URL, handleMessage)

  const handleAnimationEnd = useCallback(
    (cardId: number, e: React.AnimationEvent) => {
      // Remove after the slot collapse animation completes
      if (e.animationName === 'slotCollapse') {
        removeCard(cardId)
      }
    },
    [removeCard],
  )

  // Cleanup timers on unmount
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
          <div className={`card${card.type === 'operator' ? ' operator' : ''}`}>
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
