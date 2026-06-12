import { Clock } from 'lucide-react'
import { formatCountdown, useCountdown } from '@/features/home/hooks/use-countdown'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  target: Date | null
  className?: string
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="grid min-w-10 place-items-center rounded-lg bg-commerce px-2 py-1.5 text-lg font-bold tabular-nums text-commerce-foreground sm:min-w-12 sm:text-xl">
        {value}
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function CountdownTimer({ target, className }: CountdownTimerProps) {
  const countdown = useCountdown(target)
  const formatted = formatCountdown(countdown)

  return (
    <div
      className={cn('flex items-center gap-2 sm:gap-3', className)}
      role="timer"
      aria-live="polite"
      aria-label={
        countdown.expired
          ? 'Flash sale đã kết thúc'
          : `Còn ${formatted.hours} giờ ${formatted.minutes} phút ${formatted.seconds} giây`
      }
    >
      <Clock className="size-4 shrink-0 text-commerce sm:size-5" aria-hidden />
      <div className="flex items-center gap-1.5 sm:gap-2">
        <TimeBlock value={formatted.hours} label="Giờ" />
        <span className="pb-4 text-lg font-bold text-commerce">:</span>
        <TimeBlock value={formatted.minutes} label="Phút" />
        <span className="pb-4 text-lg font-bold text-commerce">:</span>
        <TimeBlock value={formatted.seconds} label="Giây" />
      </div>
    </div>
  )
}