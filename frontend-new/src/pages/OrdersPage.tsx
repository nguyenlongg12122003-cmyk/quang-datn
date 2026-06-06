import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { OrderDetailDialog } from '@/features/orders/OrderDetailDialog'
import { useCancelOrder, useMyOrders } from '@/features/orders/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { Order } from '@/types'

export function OrdersPage() {
  const { data: orders = [], isLoading } = useMyOrders()
  const cancelOrder = useCancelOrder()
  const [detail, setDetail] = useState<Order | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  // Surface VNPay browser-redirect result (?payment=vnpay_success|vnpay_failed).
  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment === 'vnpay_success') toast.success('Thanh toán VNPay thành công!')
    else if (payment === 'vnpay_failed') toast.error('Thanh toán VNPay thất bại.')
  }, [searchParams])

  if (isLoading) {
    return (
      <PageContainer className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </PageContainer>
    )
  }

  if (orders.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={Package}
          title="Chưa có đơn hàng"
          description="Các đơn hàng của bạn sẽ hiển thị tại đây."
          action={
            <Button asChild>
              <Link to="/products">Mua sắm ngay</Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <h1 className="text-2xl font-bold">Đơn hàng của tôi</h1>
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold">{order.id}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {order.items.length} sản phẩm · Tổng{' '}
                <span className="font-semibold text-primary">{formatCurrency(order.total)}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetail(order)}>
                  Chi tiết
                </Button>
                {order.status === 'pending' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setCancelId(order.id)}
                  >
                    Hủy đơn
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <OrderDetailDialog order={detail} onOpenChange={(open) => !open && setDetail(null)} />
      <ConfirmDialog
        open={Boolean(cancelId)}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Hủy đơn hàng?"
        description="Bạn có chắc muốn hủy đơn hàng này? Thao tác không thể hoàn tác."
        confirmLabel="Hủy đơn"
        destructive
        onConfirm={() => {
          if (!cancelId) return
          cancelOrder.mutate(cancelId, {
            onSuccess: () => toast.success('Đã hủy đơn hàng'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setCancelId(null)
        }}
      />
    </PageContainer>
  )
}
