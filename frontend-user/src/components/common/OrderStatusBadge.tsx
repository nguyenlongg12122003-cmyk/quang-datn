import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipping: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-200 text-gray-700',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[status])}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  )
}
