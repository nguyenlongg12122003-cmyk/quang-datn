import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/lib/api/endpoints/chat'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'

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