import type { CommentEventType } from '../../../shared/types'

export const EVENT_LABELS: Record<CommentEventType, string> = {
  comment: 'コメント',
  gift: 'ギフト',
  emotion: 'エモーション',
  notification: '通知',
  operatorComment: '運営コメント'
}
