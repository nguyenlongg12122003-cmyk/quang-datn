import type { ReactNode } from 'react'
import { ArrowRight, Eye, PackageCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import {
  getNextOrderStatus,
  getPaymentBlockReason,
  requiresHandoffDialog,
} from '@/features/orders/order-helpers'
import type { Order, OrderStatus } from '@/types'

interface OrderRowActionProps {
  order: Order
  pending: boolean
  onAdvance: (next: OrderStatus) => void
  onHandoff: () => void
  onDeliver: () => void
}

export function OrderRowAction({
  order,
  pending,
  onAdvance,
  onHandoff,
  onDeliver,
}: OrderRowActionProps) {
  const location = useLocation()
  const detailTo = `/orders/${order.id}`
  const detailState = { backTo: `${location.pathname}${location.search}` }

  const nextStatus = getNextOrderStatus(order)
  const paymentBlockReason = nextStatus ? getPaymentBlockReason(order, nextStatus) : null

  let primaryAction: ReactNode = null

  if (nextStatus && requiresHandoffDialog(order, nextStatus)) {
    primaryAction = (
      <Button size="sm" disabled={pending || Boolean(paymentBlockReason)} onClick={onHandoff}>
        <PackageCheck className="size-4" />
        Bàn giao
      </Button>
    )
  } else if (nextStatus === 'delivered') {
    primaryAction = (
      <Button size="sm" disabled={pending} onClick={onDeliver}>
        <ArrowRight className="size-4" />
        {ORDER_STATUS_LABELS.delivered}
      </Button>
    )
  } else if (nextStatus) {
    primaryAction = (
      <Button
        size="sm"
        disabled={pending || Boolean(paymentBlockReason)}
        onClick={() => onAdvance(nextStatus)}
        title={paymentBlockReason ?? undefined}
      >
        <ArrowRight className="size-4" />
        {ORDER_STATUS_LABELS[nextStatus]}
      </Button>
    )
  }

  return (
    <div className="flex justify-end gap-1">
      {primaryAction}
      <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
        <Link
          to={detailTo}
          state={detailState}
          aria-label={`Xem chi tiết ${order.id}`}
          title="Xem chi tiết"
        >
          <Eye className="size-4" />
        </Link>
      </Button>
    </div>
  )
}