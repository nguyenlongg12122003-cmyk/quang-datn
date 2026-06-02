import { useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import { ChatPanelShell } from '@/components/chat/shared/ChatPanelShell'
import { ChatBubble } from '@/components/chat/shared/ChatBubble'
import { ChatComposer } from '@/components/chat/shared/ChatComposer'
import { RecommendedProducts } from '@/components/chat/shared/RecommendedProducts'
import { useAiMessages, useSendAi } from '@/features/chat/api'
import { chatApi } from '@/lib/api/endpoints/chat'

interface AiAdvisorPanelProps {
  onClose: () => void
}

export function AiAdvisorPanel({ onClose }: AiAdvisorPanelProps) {
  const { data: messages = [], isLoading } = useAiMessages()
  const sendAi = useSendAi()
  const scrollRef = useRef<HTMLDivElement>(null)

  const awaitingReply =
    messages.length > 0 && messages[messages.length - 1].senderRole === 'customer'

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, awaitingReply])

  useEffect(() => {
    chatApi.markAiRead().catch(() => undefined)
  }, [messages.length])

  return (
    <ChatPanelShell
      title="AI tư vấn sản phẩm"
      subtitle="Gợi ý sản phẩm phù hợp với nhu cầu"
      icon={<Bot className="size-4" />}
      onClose={onClose}
      footer={
        <ChatComposer
          onSend={(m) => sendAi.mutate(m)}
          disabled={sendAi.isPending || awaitingReply}
          placeholder="Mô tả nhu cầu của bạn…"
        />
      }
    >
      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground">Đang tải…</p>
      ) : messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Xin chào! Hãy cho mình biết bạn cần loại văn phòng phẩm nào nhé.
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} mine={m.senderRole === 'customer'}>
              {m.metadata?.recommendedProducts?.length ? (
                <RecommendedProducts products={m.metadata.recommendedProducts} />
              ) : null}
            </ChatBubble>
          ))}
          {awaitingReply ? (
            <p className="text-xs italic text-muted-foreground">AI đang soạn trả lời…</p>
          ) : null}
          <div ref={scrollRef} />
        </div>
      )}
    </ChatPanelShell>
  )
}
