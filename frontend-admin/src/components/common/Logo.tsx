import { Link } from 'react-router'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  to?: string
  /** Show icon only, no wordmark */
  compact?: boolean
  /** Hide wordmark below sm breakpoint to save header space on small screens */
  hideWordmarkBelowSm?: boolean
}

export function Logo({
  className,
  to = '/',
  compact = false,
  hideWordmarkBelowSm = false,
}: LogoProps) {
  return (
    <Link to={to} className={cn('flex items-center gap-2 font-bold', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <PenLine className="size-5" />
      </span>
      {!compact ? (
        <span
          className={cn(
            'text-lg tracking-tight',
            hideWordmarkBelowSm && 'hidden sm:inline',
          )}
        >
          Quang<span className="text-primary">VPP</span>
        </span>
      ) : null}
    </Link>
  )
}
