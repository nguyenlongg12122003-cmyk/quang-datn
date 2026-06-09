import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatMessage } from '@/types'

export function useChatSocket(): void {
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return
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
      upsert(queryKeys.chat.support, msg)
    }

    socket.on('new_message', handler)
    return () => {
      socket.off('new_message', handler)
    }
  }, [queryClient, token])
}