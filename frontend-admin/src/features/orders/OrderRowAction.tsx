import type { ReactNode } from 'react'
import { ArrowRight, Eye, PackageCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  compact?: boolean
  onAdvance: (next: OrderStatus) => void
  onHandoff: () => void
  onDeliver: () => void
}

function ActionTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export function OrderRowAction({
  order,
  pending,
  compact = false,
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
    const button = (
      <Button
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'size-8 shrink-0' : undefined}
        disabled={pending || Boolean(paymentBlockReason)}
        onClick={onHandoff}
        aria-label="Bàn giao vận chuyển"
        title={compact ? undefined : paymentBlockReason ?? undefined}
      >
        <PackageCheck className="size-4" />
        {!compact ? 'Bàn giao' : null}
      </Button>
    )
    primaryAction = compact ? (
      <ActionTooltip label={paymentBlockReason ?? 'Bàn giao vận chuyển'}>{button}</ActionTooltip>
    ) : (
      button
    )
  } else if (nextStatus === 'delivered') {
    const button = (
      <Button
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'size-8 shrink-0' : undefined}
        disabled={pending}
        onClick={onDeliver}
        aria-label={ORDER_STATUS_LABELS.delivered}
      >
        <ArrowRight className="size-4" />
        {!compact ? ORDER_STATUS_LABELS.delivered : null}
      </Button>
    )
    primaryAction = compact ? (
      <ActionTooltip label={ORDER_STATUS_LABELS.delivered}>{button}</ActionTooltip>
    ) : (
      button
    )
  } else if (nextStatus) {
    const label = ORDER_STATUS_LABELS[nextStatus]
    const button = (
      <Button
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'size-8 shrink-0' : undefined}
        disabled={pending || Boolean(paymentBlockReason)}
        onClick={() => onAdvance(nextStatus)}
        aria-label={label}
        title={compact ? undefined : paymentBlockReason ?? undefined}
      >
        <ArrowRight className="size-4" />
        {!compact ? label : null}
      </Button>
    )
    primaryAction = compact ? (
      <ActionTooltip label={paymentBlockReason ?? label}>{button}</ActionTooltip>
    ) : (
      button
    )
  }

  const detailButton = (
    <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
      <Link
        to={detailTo}
        state={detailState}
        aria-label={`Xem chi tiết ${order.id}`}
        title={compact ? undefined : 'Xem chi tiết'}
      >
        <Eye className="size-4" />
      </Link>
    </Button>
  )

  return (
    <div className="flex justify-end gap-1">
      {primaryAction}
      {compact ? (
        <ActionTooltip label="Xem chi tiết">{detailButton}</ActionTooltip>
      ) : (
        detailButton
      )}
    </div>
  )
}