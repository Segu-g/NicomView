import type { CommentViewerAPI } from '../../shared/types'

declare global {
  interface Window {
    commentViewerAPI: CommentViewerAPI
  }
}
