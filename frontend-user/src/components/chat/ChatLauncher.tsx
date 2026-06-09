import { Bot, Headset, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatUiStore } from '@/stores/chat-ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { SupportChatPanel } from '@/components/chat/SupportChatPanel'
import { AiAdvisorPanel } from '@/components/chat/AiAdvisorPanel'

/**
 * Floating launcher with two channels:
 * - Support chat (any authenticated user)
 * - AI product advisor (customers only, per backend restriction)
 */
export function ChatLauncher() {
  const user = useAuthStore((s) => s.user)
  const openPanel = useChatUiStore((s) => s.openPanel)
  const toggle = useChatUiStore((s) => s.toggle)
  const setOpenPanel = useChatUiStore((s) => s.setOpenPanel)

  // Hide on admin surfaces; chat console lives in the admin area.
  if (user?.role === 'admin') return null

  const isCustomer = !user || user.role === 'customer'

  return (
    <>
      {openPanel === 'support' ? (
        <SupportChatPanel onClose={() => setOpenPanel(null)} />
      ) : null}
      {openPanel === 'ai' && isCustomer ? (
        <AiAdvisorPanel onClose={() => setOpenPanel(null)} />
      ) : null}

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {isCustomer ? (
          <Button
            size="icon"
            className="size-12 rounded-full shadow-lg"
            onClick={() => toggle('ai')}
            aria-label="AI tư vấn sản phẩm"
          >
            {openPanel === 'ai' ? <X className="size-5" /> : <Bot className="size-5" />}
          </Button>
        ) : null}
        <Button
          size="icon"
          variant="secondary"
          className="size-12 rounded-full border border-border shadow-lg"
          onClick={() => toggle('support')}
          aria-label="Chat hỗ trợ"
        >
          {openPanel === 'support' ? (
            <X className="size-5" />
          ) : user ? (
            <Headset className="size-5" />
          ) : (
            <MessageCircle className="size-5" />
          )}
        </Button>
      </div>
    </>
  )
}
