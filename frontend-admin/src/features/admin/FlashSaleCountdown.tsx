import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlashSaleCountdownProps {
  endAt: string
  className?: string
}

function formatRemaining(ms: number) {
  if (ms <= 0) return null
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function FlashSaleCountdown({ endAt, className }: FlashSaleCountdownProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(endAt).getTime() - Date.now()),
  )

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, new Date(endAt).getTime() - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endAt])

  const label = formatRemaining(remaining)
  if (!label) {
    return <span className={cn('text-xs text-destructive', className)}>Đã kết thúc</span>
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium text-commerce', className)}>
      <Clock className="size-3.5 shrink-0" />
      <span>Kết thúc sau {label}</span>
    </div>
  )
}