import { api } from '@/lib/api/axios'
import type { ChatMessage, SupportConversation } from '@/types'

export const chatApi = {
  // Support
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

  // AI advisor (customer only)
  aiMessages: () =>
    api.get<ChatMessage[]>('/chat/ai/messages').then((r) => r.data),
  sendAi: (message: string) =>
    api
      .post<{
        id: string
        message: string
        aiMessage: ChatMessage | null
        aiReplyScheduled: boolean
      }>('/chat/ai/messages', { message })
      .then((r) => r.data),
  markAiRead: () =>
    api.patch<{ message: string }>('/chat/ai/messages/read', {}).then((r) => r.data),
}
