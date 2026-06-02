import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/lib/api/endpoints/chat'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatMessage } from '@/types'

// ── Support ──────────────────────────────────────────────────────────────────
export function useSupportMessages(userId?: string, enabled = true) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: queryKeys.chat.support(userId),
    queryFn: () => chatApi.supportMessages(userId),
    enabled: Boolean(token) && enabled,
  })
}

export function useSendSupport(userId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => chatApi.sendSupport(message, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.support(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    },
  })
}

export function useSupportConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: chatApi.listConversations,
  })
}

// ── AI advisor ───────────────────────────────────────────────────────────────
function isAwaitingAiReply(messages: ChatMessage[] | undefined): boolean {
  if (!messages?.length) return false
  return messages[messages.length - 1].senderRole === 'customer'
}

export function useAiMessages(enabled = true) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: queryKeys.chat.ai,
    queryFn: chatApi.aiMessages,
    enabled: Boolean(token) && enabled,
    // Poll while the assistant reply is still being generated (async on the backend).
    refetchInterval: (query) =>
      isAwaitingAiReply(query.state.data as ChatMessage[] | undefined) ? 2000 : false,
  })
}

export function useSendAi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => chatApi.sendAi(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.ai })
    },
  })
}
