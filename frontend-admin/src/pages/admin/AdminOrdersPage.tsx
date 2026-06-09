import { useMemo, useState } from 'react'
import { Printer, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { printOrderSlips } from '@/features/orders/packing-slip'
import {
  useAdminOrders,
  useResolveReturn,
  useUpdateOrderStatus,
} from '@/features/orders/api'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { ORDER_STATUS_LABELS, PACKING_SLIP_STATUSES } from '@/lib/constants'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [printing, setPrinting] = useState(false)

  const packingOrders = useMemo(
    () => orders.filter((order) => PACKING_SLIP_STATUSES.includes(order.status)),
    [orders],
  )

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.has(order.id)),
    [orders, selectedIds],
  )

  const allVisibleSelected = orders.length > 0 && orders.every((order) => selectedIds.has(order.id))
  const someVisibleSelected = orders.some((order) => selectedIds.has(order.id))

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

  const toggleOrder = (orderId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(orderId)
      else next.delete(orderId)
      return next
    })
  }

  const toggleAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(orders.map((order) => order.id)))
  }

  const handlePrint = async (targets: Order[], emptyMessage: string) => {
    if (targets.length === 0) {
      toast.message(emptyMessage)
      return
    }

    setPrinting(true)
    try {
      const ok = await printOrderSlips(targets)
      if (!ok) {
        toast.error('Trình duyệt chặn cửa sổ in. Hãy cho phép popup rồi thử lại.')
        return
      }
      toast.success(
        targets.length === 1
          ? `Đã mở phiếu in cho ${targets[0].id}`
          : `Đã mở ${targets.length} phiếu in`,
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Đơn hàng</h1>
          <p className="text-sm text-muted-foreground">
            In phiếu đóng gói trước khi bàn giao vận chuyển
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={printing || selectedOrders.length === 0}
          onClick={() => handlePrint(selectedOrders, 'Chưa chọn đơn nào để in')}
        >
          <Printer className="size-4" />
          In phiếu đã chọn ({selectedOrders.length})
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={printing || packingOrders.length === 0}
          onClick={() =>
            handlePrint(
              packingOrders,
              'Không có đơn ở trạng thái "Đã xác nhận" hoặc "Đang xử lý" trong danh sách hiện tại',
            )
          }
        >
          <Printer className="size-4" />
          In đơn cần đóng gói ({packingOrders.length})
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                  aria-label="Chọn tất cả đơn hiển thị"
                />
              </TableHead>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Tổng</TableHead>
              <TableHead className="min-w-[300px]">Trạng thái & xử lý</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Đang tải…</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Không có đơn hàng</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const rowPending =
                  (updateStatus.isPending && updateStatus.variables?.id === order.id) ||
                  (resolveReturn.isPending && resolveReturn.variables?.id === order.id)
                return (
                  <TableRow key={order.id}>
                    <TableCell className="align-top">
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={(checked) => toggleOrder(order.id, checked === true)}
                        aria-label={`Chọn đơn ${order.id}`}
                      />
                    </TableCell>
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
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={printing}
                          onClick={() => handlePrint([order], '')}
                          aria-label={`In phiếu ${order.id}`}
                          title="In phiếu đóng gói"
                        >
                          <Printer className="size-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDetail(order)}>
                          Xem
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <OrderDetailDialog
        order={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        onPrint={async (target) => {
          await handlePrint([target], '')
        }}
        printing={printing}
      />
    </div>
  )
}