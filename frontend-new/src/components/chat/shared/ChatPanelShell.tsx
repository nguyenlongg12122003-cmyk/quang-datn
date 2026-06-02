import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatPanelShellProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function ChatPanelShell({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  className,
}: ChatPanelShellProps) {
  return (
    <div
      className={cn(
        'fixed bottom-24 right-5 z-50 flex h-[32rem] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl',
        className,
      )}
    >
      <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/20">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          {subtitle ? <p className="truncate text-xs opacity-80">{subtitle}</p> : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary-foreground hover:bg-primary-foreground/20"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
      {footer}
    </div>
  )
}
