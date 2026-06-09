import { api } from '@/lib/api/axios'
import type { ChatMessage } from '@/types'

export const chatApi = {
  supportMessages: () =>
    api.get<ChatMessage[]>('/chat/support/messages').then((r) => r.data),
  sendSupport: (message: string) =>
    api
      .post<{ id: string; message: string }>('/chat/support/messages', { message })
      .then((r) => r.data),
  markSupportRead: () =>
    api.patch<{ message: string }>('/chat/support/messages/read', {}).then((r) => r.data),

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