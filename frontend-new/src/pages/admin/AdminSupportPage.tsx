import { useEffect, useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ChatBubble } from '@/components/chat/shared/ChatBubble'
import { ChatComposer } from '@/components/chat/shared/ChatComposer'
import { EmptyState } from '@/components/common/EmptyState'
import {
  useSendSupport,
  useSupportConversations,
  useSupportMessages,
} from '@/features/chat/api'
import { chatApi } from '@/lib/api/endpoints/chat'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

export function AdminSupportPage() {
  const { data: conversations = [] } = useSupportConversations()
  const [activeUserId, setActiveUserId] = useState<string | undefined>()
  const { data: messages = [] } = useSupportMessages(activeUserId, Boolean(activeUserId))
  const sendSupport = useSendSupport(activeUserId)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (activeUserId) chatApi.markSupportRead(activeUserId).catch(() => undefined)
  }, [activeUserId, messages.length])

  const activeConversation = conversations.find((c) => c.userId === activeUserId)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Hỗ trợ khách hàng</h1>
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Conversations */}
        <Card className="max-h-[70vh] overflow-y-auto p-0">
          {conversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Chưa có hội thoại</p>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.userId}>
                  <button
                    type="button"
                    onClick={() => setActiveUserId(c.userId)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border p-3 text-left transition-colors hover:bg-accent',
                      activeUserId === c.userId && 'bg-accent',
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={c.userAvatar ?? undefined} alt={c.userName} />
                      <AvatarFallback>{c.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.userName}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                    </div>
                    {c.unreadCount > 0 ? (
                      <Badge className="size-5 justify-center rounded-full p-0 text-[10px]">
                        {c.unreadCount}
                      </Badge>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Thread */}
        <Card className="flex h-[70vh] flex-col p-0">
          {!activeUserId ? (
            <div className="grid flex-1 place-items-center">
              <EmptyState icon={MessagesSquare} title="Chọn một hội thoại" description="Chọn khách hàng để xem và trả lời." />
            </div>
          ) : (
            <>
              <div className="border-b border-border p-3">
                <p className="font-semibold">{activeConversation?.userName ?? 'Khách hàng'}</p>
                {activeConversation ? (
                  <p className="text-xs text-muted-foreground">
                    Hoạt động {formatRelative(activeConversation.lastMessageAt)}
                  </p>
                ) : null}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <ChatBubble key={m.id} message={m} mine={m.senderRole !== 'customer'} />
                ))}
                <div ref={scrollRef} />
              </div>
              <ChatComposer
                onSend={(message) => sendSupport.mutate(message)}
                disabled={sendSupport.isPending}
                placeholder="Trả lời khách hàng…"
              />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
