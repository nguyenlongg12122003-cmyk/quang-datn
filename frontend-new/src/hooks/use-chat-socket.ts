import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatMessage } from '@/types'

/**
 * Subscribes to the `new_message` socket event and pushes incoming messages into
 * the relevant React Query caches, deduping by message id (per backend guidance).
 */
export function useChatSocket(): void {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token || !user) return
    const socket = getSocket()

    const upsert = (key: readonly unknown[], msg: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(key, (prev) => {
        if (!prev) return [msg]
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }

    const handler = (msg: ChatMessage) => {
      if (msg.channel === 'ai') {
        upsert(queryKeys.chat.ai, msg)
        return
      }
      // Support channel: customer view keyed by 'me'; admin view keyed by counterpart user.
      if (user.role === 'admin' || user.role === 'staff') {
        const counterpart =
          msg.senderRole === 'customer' ? msg.senderId : msg.targetUserId
        if (counterpart) upsert(queryKeys.chat.support(counterpart), msg)
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
      } else {
        upsert(queryKeys.chat.support(undefined), msg)
      }
    }

    socket.on('new_message', handler)
    return () => {
      socket.off('new_message', handler)
    }
  }, [queryClient, token, user])
}
