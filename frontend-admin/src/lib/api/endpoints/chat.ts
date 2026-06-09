import { api } from '@/lib/api/axios'
import type { ChatMessage, SupportConversation } from '@/types'

export const chatApi = {
  listConversations: () =>
    api
      .get<SupportConversation[]>('/chat/support/conversations')
      .then((r) => r.data),
  supportMessages: (userId?: string) =>
    api
      .get<ChatMessage[]>('/chat/support/messages', {
        params: userId ? { userId } : undefined,
      })
      .then((r) => r.data),
  sendSupport: (message: string, targetUserId?: string) =>
    api
      .post<{ id: string; message: string }>('/chat/support/messages', {
        message,
        targetUserId,
      })
      .then((r) => r.data),
  markSupportRead: (userId?: string) =>
    api
      .patch<{ message: string }>(
        '/chat/support/messages/read',
        userId ? { userId } : {},
      )
      .then((r) => r.data),
}