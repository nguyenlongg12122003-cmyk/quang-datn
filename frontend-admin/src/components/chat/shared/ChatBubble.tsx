import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface ChatBubbleProps {
  message: ChatMessage
  mine: boolean
  children?: React.ReactNode
}

export function ChatBubble({ message, mine, children }: ChatBubbleProps) {
  return (
    <div className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
          mine
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {!mine ? (
          <p className="mb-0.5 text-xs font-medium opacity-70">{message.senderName}</p>
        ) : null}
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
      </div>
      {children}
      <span className="px-1 text-[10px] text-muted-foreground">
        {formatRelative(message.timestamp)}
      </span>
    </div>
  )
}
