import { useCallback } from 'react'
import type { CommentEventType } from '../../shared/types'
import { useWebSocket } from './useWebSocket'

const WS_URL = 'ws://localhost:3940'

// --- Event data types ---

export interface CommentData {
  content?: string
  userName?: string
  userId?: string
  userIcon?: string
  isHistory?: boolean
}

export interface GiftData {
  userName?: string
  userIcon?: string
  itemName?: string
  point?: number
  isHistory?: boolean
}

export interface NotificationData {
  message?: string
  isHistory?: boolean
}

export interface OperatorCommentData {
  content?: string
  name?: string
  iconUrl?: string
  isHistory?: boolean
}

export interface EmotionData {
  content?: string
  id?: string
  isHistory?: boolean
}

// --- Handler map type ---

export interface CommentEventHandlers {
  onComment?: (data: CommentData) => void
  onGift?: (data: GiftData) => void
  onNotification?: (data: NotificationData) => void
  onOperatorComment?: (data: OperatorCommentData) => void
  onEmotion?: (data: EmotionData) => void
  onClear?: () => void
}

const EVENT_TO_HANDLER: Record<CommentEventType, keyof CommentEventHandlers> = {
  comment: 'onComment',
  gift: 'onGift',
  notification: 'onNotification',
  operatorComment: 'onOperatorComment',
  emotion: 'onEmotion',
}

export function useCommentEvents(handlers: CommentEventHandlers): void {
  const handleMessage = useCallback(
    (event: string, data: unknown) => {
      if (event === 'clear') {
        handlers.onClear?.()
        return
      }
      const handlerKey = EVENT_TO_HANDLER[event as CommentEventType]
      if (!handlerKey) return
      const handler = handlers[handlerKey] as ((data: unknown) => void) | undefined
      handler?.(data)
    },
    [handlers.onComment, handlers.onGift, handlers.onNotification, handlers.onOperatorComment, handlers.onEmotion, handlers.onClear],
  )

  useWebSocket(WS_URL, handleMessage)
}
