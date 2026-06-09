import { Link, useLocation, useParams } from 'react-router'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb'
import { OrderDetailContent, OrderDetailHeader } from '@/features/orders/OrderDetailContent'
import { useAdminOrder } from '@/features/orders/api'
import { getErrorMessage } from '@/lib/api/axios'

type OrdersBackState = {
  backTo?: string
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-72" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const location = useLocation()
  const backTo = (location.state as OrdersBackState | null)?.backTo ?? '/orders'

  const { data: order, isLoading, isError, error, refetch } = useAdminOrder(id)

  if (isLoading) {
    return <OrderDetailSkeleton />
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Đơn hàng', href: backTo },
            { label: id || 'Chi tiết' },
          ]}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Không tải được đơn hàng</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{getErrorMessage(error)}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Thử lại
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={backTo}>Về danh sách</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Đơn hàng', href: backTo },
            { label: 'Không tìm thấy' },
          ]}
        />
        <Alert>
          <AlertTitle>Đơn hàng không tồn tại</AlertTitle>
          <AlertDescription>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to={backTo}>Quay lại danh sách đơn hàng</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Đơn hàng', href: backTo },
          { label: order.id },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <OrderDetailHeader order={order} />
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link to={backTo}>
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
        </Button>
      </div>

      <OrderDetailContent order={order} />
    </div>
  )
}