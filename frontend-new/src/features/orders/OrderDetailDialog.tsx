import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants'
import type { Order } from '@/types'

interface OrderDetailDialogProps {
  order: Order | null
  onOpenChange: (open: boolean) => void
}

export function OrderDetailDialog({ order, onOpenChange }: OrderDetailDialogProps) {
  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                Đơn {order.id} <OrderStatusBadge status={order.status} />
              </DialogTitle>
              <DialogDescription>{formatDateTime(order.createdAt)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <section>
                <h4 className="mb-1 font-semibold">Người nhận</h4>
                <p>{order.shippingAddress.name} · {order.shippingAddress.phone}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.street}, {order.shippingAddress.ward},{' '}
                  {order.shippingAddress.district}, {order.shippingAddress.city}
                </p>
              </section>

              <Separator />

              <section className="space-y-2">
                <h4 className="font-semibold">Sản phẩm</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="size-12 rounded object-cover" />
                    ) : null}
                    <div className="flex-1">
                      <p className="line-clamp-1">{item.productName}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(item.price)} × {item.quantity}
                        {item.customization ? ` · ${item.customization.type}` : ''}
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </section>

              <Separator />

              <section className="space-y-1">
                <Row label="Tạm tính" value={formatCurrency(order.subtotal)} />
                <Row label="Phí vận chuyển" value={formatCurrency(order.shippingFee)} />
                {order.discount > 0 ? <Row label="Giảm giá" value={`−${formatCurrency(order.discount)}`} /> : null}
                <Row label="Tổng cộng" value={formatCurrency(order.total)} bold />
                <Row label="Thanh toán" value={`${PAYMENT_METHOD_LABELS[order.paymentMethod]} · ${PAYMENT_STATUS_LABELS[order.paymentStatus]}`} />
              </section>

              {order.timeline.length > 0 ? (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h4 className="font-semibold">Lịch sử đơn hàng</h4>
                    <ol className="space-y-2 border-l border-border pl-4">
                      {order.timeline.map((t, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[1.3rem] top-1 size-2 rounded-full bg-primary" />
                          <p className="font-medium">{ORDER_STATUS_LABELS[t.status]}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(t.date)}
                            {t.note ? ` · ${t.note}` : ''}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              ) : null}

              {order.returnRequest ? (
                <>
                  <Separator />
                  <section className="rounded-lg bg-muted p-3">
                    <h4 className="font-semibold">Yêu cầu hoàn trả</h4>
                    <p className="text-muted-foreground">Lý do: {order.returnRequest.reason}</p>
                    <p className="text-muted-foreground">Trạng thái: {order.returnRequest.status}</p>
                  </section>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-bold text-primary' : 'font-medium'}>{value}</span>
    </div>
  )
}
