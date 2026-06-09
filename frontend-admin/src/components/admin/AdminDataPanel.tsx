import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AdminDataPanelProps {
  children: ReactNode
  className?: string
}

export function AdminDataPanel({ children, className }: AdminDataPanelProps) {
  return (
    <Card className={cn('overflow-hidden border-border/70 p-0 shadow-sm', className)}>
      {children}
    </Card>
  )
}