import { useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrderDetailDialog } from '@/features/orders/OrderDetailDialog'
import { OrderStatusControl } from '@/features/orders/OrderStatusControl'
import {
  useAdminOrders,
  useResolveReturn,
  useUpdateOrderStatus,
} from '@/features/orders/api'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import type { Order, OrderStatus } from '@/types'

const STATUS_FILTERS: Array<OrderStatus | 'all'> = [
  'all', 'pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled', 'returned',
]

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const q = useDebounce(search, 300)
  const { data: orders = [], isLoading } = useAdminOrders({ status, q: q || undefined })
  const updateStatus = useUpdateOrderStatus()
  const resolveReturn = useResolveReturn()
  const [detail, setDetail] = useState<Order | null>(null)

  const changeStatus = (order: Order, next: OrderStatus) => {
    updateStatus.mutate(
      { id: order.id, status: next },
      {
        onSuccess: () => toast.success(`Đã cập nhật: ${ORDER_STATUS_LABELS[next]}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  const resolve = (order: Order, action: 'approved' | 'rejected') => {
    resolveReturn.mutate(
      { id: order.id, action },
      {
        onSuccess: () => toast.success(action === 'approved' ? 'Đã duyệt hoàn trả' : 'Đã từ chối'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Đơn hàng</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn / địa chỉ"
              className="w-56 pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'Tất cả' : ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Tổng</TableHead>
              <TableHead className="min-w-[300px]">Trạng thái & xử lý</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Đang tải…</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const rowPending =
                  (updateStatus.isPending && updateStatus.variables?.id === order.id) ||
                  (resolveReturn.isPending && resolveReturn.variables?.id === order.id)
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium align-top">{order.id}</TableCell>
                    <TableCell className="text-muted-foreground align-top">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="align-top">{formatCurrency(order.total)}</TableCell>
                    <TableCell className="align-top">
                      <OrderStatusControl
                        order={order}
                        pending={rowPending}
                        onAdvance={(next) => changeStatus(order, next)}
                        onCancel={() => changeStatus(order, 'cancelled')}
                        onResolveReturn={(action) => resolve(order, action)}
                      />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Button variant="outline" size="sm" onClick={() => setDetail(order)}>
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <OrderDetailDialog order={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  )
}
