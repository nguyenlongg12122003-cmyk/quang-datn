import { useState } from 'react'
import { ArrowRight, Check, PackageCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS } from '@/lib/constants'
import {
  getNextOrderStatus,
  getPaymentBlockReason,
  hasPendingReturn,
  requiresHandoffDialog,
} from '@/features/orders/order-helpers'
import { cn } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

const PIPELINE = ['pending', 'confirmed', 'processing', 'shipping', 'delivered'] as const
type PipelineStatus = (typeof PIPELINE)[number]

const STEP_LABELS: Record<PipelineStatus, string> = {
  pending: 'Chờ',
  confirmed: 'Xác nhận',
  processing: 'Đóng gói',
  shipping: 'Giao hàng',
  delivered: 'Hoàn tất',
}

function StatusPipeline({ status }: { status: OrderStatus }) {
  const currentIndex = (PIPELINE as readonly OrderStatus[]).indexOf(status)
  return (
    <ol className="flex items-start">
      {PIPELINE.map((step, i) => {
        const done = i < currentIndex
        const current = i === currentIndex
        return (
          <li key={step} className="flex items-start">
            <div className="flex w-14 flex-col items-center gap-1.5 sm:w-16">
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full border text-[11px] font-semibold transition-colors sm:size-8',
                  done && 'border-primary bg-primary text-primary-foreground',
                  current && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30',
                  !done && !current && 'border-border bg-background text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-center text-[10px] leading-tight sm:text-[11px]',
                  current ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < PIPELINE.length - 1 ? (
              <span
                className={cn(
                  'mt-3.5 h-0.5 w-5 rounded-full sm:w-6',
                  i < currentIndex ? 'bg-primary' : 'bg-border',
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

interface OrderStatusControlProps {
  order: Order
  pending: boolean
  onAdvance: (next: OrderStatus) => void
  onHandoff: () => void
  onCancel: () => void
  onResolveReturn: (action: 'approved' | 'rejected') => void
  className?: string
}

export function OrderStatusControl({
  order,
  pending,
  onAdvance,
  onHandoff,
  onCancel,
  onResolveReturn,
  className,
}: OrderStatusControlProps) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmDeliver, setConfirmDeliver] = useState(false)

  const nextStatus = getNextOrderStatus(order)
  const paymentBlockReason = nextStatus ? getPaymentBlockReason(order, nextStatus) : null
  const canCancel = ORDER_STATUS_TRANSITIONS[order.status].includes('cancelled')
  const hasReturn = hasPendingReturn(order)
  const isOffPath = order.status === 'cancelled' || order.status === 'returned'
  const needsHandoff = nextStatus ? requiresHandoffDialog(order, nextStatus) : false

  return (
    <div className={cn('space-y-3', className)}>
      {isOffPath ? (
        <OrderStatusBadge status={order.status} />
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <StatusPipeline status={order.status} />
        </div>
      )}

      {order.status === 'processing' ? (
        <p className="text-xs text-muted-foreground">
          Chọn đơn vị vận chuyển và nhập mã vận đơn để bàn giao. In phiếu có thể thực hiện hàng loạt
          từ danh sách đơn.
        </p>
      ) : null}

      {paymentBlockReason ? (
        <p className="text-xs font-medium text-amber-700">{paymentBlockReason}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {hasReturn ? (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onResolveReturn('approved')}>
              <Check className="size-4" />
              Duyệt hoàn trả
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => onResolveReturn('rejected')}>
              Từ chối
            </Button>
          </>
        ) : (
          <>
            {needsHandoff ? (
              <Button size="sm" disabled={pending || Boolean(paymentBlockReason)} onClick={onHandoff}>
                <PackageCheck className="size-4" />
                Bàn giao VC
              </Button>
            ) : nextStatus === 'delivered' ? (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => setConfirmDeliver(true)}
              >
                <ArrowRight className="size-4" />
                {ORDER_STATUS_LABELS.delivered}
              </Button>
            ) : nextStatus ? (
              <Button
                size="sm"
                disabled={pending || Boolean(paymentBlockReason)}
                onClick={() => onAdvance(nextStatus)}
              >
                <ArrowRight className="size-4" />
                {ORDER_STATUS_LABELS[nextStatus]}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => setConfirmCancel(true)}
              >
                <X className="size-4" />
                Hủy
              </Button>
            ) : null}
            {!nextStatus && !canCancel ? (
              <span className="text-xs text-muted-foreground">Không có thao tác</span>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Hủy đơn hàng?"
        description={`Đơn ${order.id} sẽ chuyển sang trạng thái "Đã hủy". Hành động này không thể hoàn tác.`}
        confirmLabel="Hủy đơn"
        cancelLabel="Không"
        destructive
        onConfirm={() => {
          onCancel()
          setConfirmCancel(false)
        }}
      />

      <ConfirmDialog
        open={confirmDeliver}
        onOpenChange={setConfirmDeliver}
        title="Xác nhận đã giao hàng?"
        description={
          order.paymentMethod === 'cod'
            ? `Đơn ${order.id} sẽ chuyển sang "Đã giao" và COD sẽ được đánh dấu đã thu tiền.`
            : `Đơn ${order.id} sẽ chuyển sang trạng thái "Đã giao".`
        }
        confirmLabel="Đã giao"
        cancelLabel="Chưa"
        onConfirm={() => {
          onAdvance('delivered')
          setConfirmDeliver(false)
        }}
      />
    </div>
  )
}