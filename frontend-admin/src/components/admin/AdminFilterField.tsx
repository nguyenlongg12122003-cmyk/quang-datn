import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface AdminFilterFieldProps {
  label: string
  children: ReactNode
}

export function AdminFilterField({ label, children }: AdminFilterFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  )
}