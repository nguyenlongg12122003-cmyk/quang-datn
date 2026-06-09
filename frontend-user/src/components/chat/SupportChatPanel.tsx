import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Headset } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatPanelShell } from '@/components/chat/shared/ChatPanelShell'
import { ChatBubble } from '@/components/chat/shared/ChatBubble'
import { ChatComposer } from '@/components/chat/shared/ChatComposer'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuthStore } from '@/stores/auth-store'
import { useSendSupport, useSupportMessages } from '@/features/chat/api'
import { chatApi } from '@/lib/api/endpoints/chat'

interface SupportChatPanelProps {
  onClose: () => void
}

export function SupportChatPanel({ onClose }: SupportChatPanelProps) {
  const user = useAuthStore((s) => s.user)
  const { data: messages = [], isLoading } = useSupportMessages(Boolean(user))
  const sendSupport = useSendSupport()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (user) chatApi.markSupportRead().catch(() => undefined)
  }, [user, messages.length])

  return (
    <ChatPanelShell title="Hỗ trợ khách hàng" subtitle="Phản hồi trong giờ làm việc" icon={<Headset className="size-4" />} onClose={onClose}
      footer={user ? <ChatComposer onSend={(m) => sendSupport.mutate(m)} disabled={sendSupport.isPending} /> : undefined}
    >
      {!user ? (
        <div className="grid h-full place-items-center">
          <EmptyState
            icon={Headset}
            title="Đăng nhập để chat"
            description="Vui lòng đăng nhập để được hỗ trợ trực tiếp."
            action={
              <Button asChild size="sm">
                <Link to="/login">Đăng nhập</Link>
              </Button>
            }
          />
        </div>
      ) : isLoading ? (
        <p className="text-center text-sm text-muted-foreground">Đang tải…</p>
      ) : messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Chào {user.name}! Bạn cần hỗ trợ gì hôm nay?
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} mine={m.senderRole === 'customer'} />
          ))}
          <div ref={scrollRef} />
        </div>
      )}
    </ChatPanelShell>
  )
}
