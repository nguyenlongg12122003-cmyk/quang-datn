import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

// The linear "happy path" a healthy order moves through.
const PIPELINE = ['pending', 'confirmed', 'processing', 'shipping', 'delivered'] as const
type PipelineStatus = (typeof PIPELINE)[number]

// Compact labels shown under each stepper dot.
const STEP_LABELS: Record<PipelineStatus, string> = {
  pending: 'Chờ',
  confirmed: 'Xác nhận',
  processing: 'Xử lý',
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
            <div className="flex w-12 flex-col items-center gap-1">
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full border text-[11px] font-semibold transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  current && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30',
                  !done && !current && 'border-border bg-background text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-center text-[10px] leading-tight',
                  current ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < PIPELINE.length - 1 ? (
              <span
                className={cn(
                  'mt-3 h-0.5 w-4 rounded-full',
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
  onCancel: () => void
  onResolveReturn: (action: 'approved' | 'rejected') => void
}

export function OrderStatusControl({
  order,
  pending,
  onAdvance,
  onCancel,
  onResolveReturn,
}: OrderStatusControlProps) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const transitions = ORDER_STATUS_TRANSITIONS[order.status]
  const forward = transitions.find((t) => t !== 'cancelled') ?? null
  const canCancel = transitions.includes('cancelled')
  const hasReturn = order.returnRequest?.status === 'pending'
  const isOffPath = order.status === 'cancelled' || order.status === 'returned'

  return (
    <div className="space-y-2.5">
      {isOffPath ? <OrderStatusBadge status={order.status} /> : <StatusPipeline status={order.status} />}

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
            {forward ? (
              <Button size="sm" disabled={pending} onClick={() => onAdvance(forward)}>
                <ArrowRight className="size-4" />
                {ORDER_STATUS_LABELS[forward]}
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
            {!forward && !canCancel ? (
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
    </div>
  )
}
