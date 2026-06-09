import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/lib/api/endpoints/chat'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatMessage } from '@/types'

export function useSupportMessages(enabled = true) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: queryKeys.chat.support,
    queryFn: chatApi.supportMessages,
    enabled: Boolean(token) && enabled,
  })
}

export function useSendSupport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => chatApi.sendSupport(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.support })
    },
  })
}

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