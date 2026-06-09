import type { MouseEvent } from 'react'
import { MessageSquare, Palette } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { OrderRowAction } from '@/features/orders/OrderRowAction'
import {
  countCustomizedItems,
  hasPendingReturn,
  isAwaitingOnlinePayment,
  summarizeOrderItems,
} from '@/features/orders/order-helpers'
import {
  getNeedsActionReasons,
  getOrderWaitSeverity,
} from '@/features/orders/order-list-ui'
import { formatCurrency, formatDate, formatRelative } from '@/lib/format'
import { PAYMENT_STATUS_LABELS } from '@/lib/constants'
import type { Order, OrderStatus } from '@/types'
import { cn } from '@/lib/utils'

const WAIT_SEVERITY_CLASSES = {
  normal: 'text-muted-foreground',
  warning: 'font-medium text-amber-700',
  urgent: 'font-semibold text-red-700',
} as const

interface OrderListMobileCardProps {
  order: Order
  selected: boolean
  pending: boolean
  showNeedsActionHints: boolean
  detailState: { backTo: string }
  onToggleSelect: (checked: boolean) => void
  onOpenDetail: () => void
  onAdvance: (next: OrderStatus) => void
  onHandoff: () => void
  onDeliver: () => void
}

export function OrderListMobileCard({
  order,
  selected,
  pending,
  showNeedsActionHints,
  detailState,
  onToggleSelect,
  onOpenDetail,
  onAdvance,
  onHandoff,
  onDeliver,
}: OrderListMobileCardProps) {
  const customizedItemCount = countCustomizedItems(order)
  const waitSeverity = getOrderWaitSeverity(order)
  const needsActionReasons = showNeedsActionHints ? getNeedsActionReasons(order) : []

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-row-action]')) return
    if (target.closest('[role=checkbox]')) return
    onOpenDetail()
  }

  return (
    <Card
      className="cursor-pointer space-y-3 p-4 transition-colors hover:bg-muted/30"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelect(checked === true)}
          aria-label={`Chọn đơn ${order.id}`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/orders/${order.id}`}
              state={detailState}
              className="font-medium text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {order.id}
            </Link>
            <OrderStatusBadge status={order.status} />
            {hasPendingReturn(order) ? (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                Chờ hoàn trả
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-medium">{order.shippingAddress.name}</p>
          <p className="text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
        </div>
        <p className="shrink-0 font-semibold">{formatCurrency(order.total)}</p>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">
        {summarizeOrderItems(order.items)}
      </p>

      {customizedItemCount > 0 ? (
        <Badge
          variant="outline"
          className="border-violet-200 bg-violet-50 text-[11px] font-normal text-violet-800"
        >
          <Palette className="mr-1 size-3" />
          {customizedItemCount === 1 ? 'Tùy chỉnh' : `${customizedItemCount} tùy chỉnh`}
        </Badge>
      ) : null}

      {order.note?.trim() ? (
        <div className="flex items-center gap-1 text-xs text-amber-700">
          <MessageSquare className="size-3 shrink-0" />
          <span className="line-clamp-1">{order.note.trim()}</span>
        </div>
      ) : null}

      {needsActionReasons.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {needsActionReasons.map((reason) => (
            <Badge key={reason} variant="secondary" className="text-[11px] font-normal">
              {reason}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">{formatDate(order.createdAt)}</span>
          {waitSeverity ? (
            <span className={cn('ml-2', WAIT_SEVERITY_CLASSES[waitSeverity])}>
              · {formatRelative(order.createdAt)}
            </span>
          ) : (
            <span className="ml-2 text-muted-foreground">· {formatRelative(order.createdAt)}</span>
          )}
        </div>
        <span
          className={cn(
            isAwaitingOnlinePayment(order) ? 'font-medium text-amber-700' : 'text-muted-foreground',
          )}
        >
          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
        </span>
      </div>

      <div data-row-action className="flex justify-end border-t border-border/60 pt-3">
        <OrderRowAction
          order={order}
          pending={pending}
          onAdvance={onAdvance}
          onHandoff={onHandoff}
          onDeliver={onDeliver}
        />
      </div>
    </Card>
  )
}