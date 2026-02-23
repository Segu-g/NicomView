import type { CommentEventType } from '../../shared/types'

interface CommentData {
  content?: string
}

interface GiftData {
  userName?: string
  itemName?: string
}

interface EmotionData {
  content?: string
}

interface NotificationData {
  message?: string
}

interface OperatorCommentData {
  content?: string
}

type EventData = CommentData | GiftData | EmotionData | NotificationData | OperatorCommentData

export function formatTtsText(eventType: CommentEventType, data: unknown): string | null {
  const d = data as EventData
  switch (eventType) {
    case 'comment': {
      const { content } = d as CommentData
      return content || null
    }
    case 'gift': {
      const { userName, itemName } = d as GiftData
      if (!userName && !itemName) return null
      return `${userName ?? '匿名'}さんが${itemName ?? 'ギフト'}を贈りました`
    }
    case 'emotion': {
      const { content } = d as EmotionData
      return content || null
    }
    case 'notification': {
      const { message } = d as NotificationData
      return message || null
    }
    case 'operatorComment': {
      const { content } = d as OperatorCommentData
      if (!content) return null
      return `運営コメント: ${content}`
    }
    default:
      return null
  }
}
