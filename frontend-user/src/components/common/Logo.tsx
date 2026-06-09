import { Link } from 'react-router'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  to?: string
}

export function Logo({ className, to = '/' }: LogoProps) {
  return (
    <Link to={to} className={cn('flex items-center gap-2 font-bold', className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <PenLine className="size-5" />
      </span>
      <span className="text-lg tracking-tight">
        Quang<span className="text-primary">VPP</span>
      </span>
    </Link>
  )
}
