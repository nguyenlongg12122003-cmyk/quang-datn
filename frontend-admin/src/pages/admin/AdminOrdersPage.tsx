import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { MessageSquare, Palette, Printer, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { OrderHandoffDialog } from '@/features/orders/OrderHandoffDialog'
import { OrderListEmptyState } from '@/features/orders/OrderListEmptyState'
import { OrderListMobileCard } from '@/features/orders/OrderListMobileCard'
import { OrderListSkeleton } from '@/features/orders/OrderListSkeleton'
import { OrderRowAction } from '@/features/orders/OrderRowAction'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { printOrderSlips } from '@/features/orders/packing-slip'
import {
  useAdminOrders,
  useMarkPackingSlipPrinted,
  useUpdateOrderStatus,
} from '@/features/orders/api'
import {
  getNeedsActionReasons,
  getOrderTabEmptyState,
  getOrderWaitSeverity,
} from '@/features/orders/order-list-ui'
import {
  countCustomizedItems,
  hasPackingSlipPrinted,
  hasPendingReturn,
  isAwaitingOnlinePayment,
  summarizeOrderItems,
} from '@/features/orders/order-helpers'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency, formatDate, formatNumber, formatRelative } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import {
  ORDER_STATUS_LABELS,
  ORDER_TAB_DESCRIPTIONS,
  ORDER_TAB_LABELS,
  PACKING_SLIP_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_CARRIER_LABELS,
} from '@/lib/constants'
import type { OrderTab } from '@/lib/api/endpoints/orders'
import type { Order, OrderStatus, ShippingCarrier } from '@/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const ORDER_TABS: OrderTab[] = [
  'all',
  'pending',
  'needs_action',
  'packing',
  'shipping',
  'return_pending',
]

const WAIT_SEVERITY_CLASSES = {
  normal: 'text-muted-foreground',
  warning: 'font-medium text-amber-700',
  urgent: 'font-semibold text-red-700',
} as const

function parseTab(value: string | null): OrderTab {
  if (value && ORDER_TABS.includes(value as OrderTab)) {
    return value as OrderTab
  }
  return 'all'
}

function syncOrderInState(current: Order | null, orderId: string, patch: Partial<Order>): Order | null {
  if (!current || current.id !== orderId) return current
  return { ...current, ...patch }
}

function isInteractiveRowTarget(target: HTMLElement): boolean {
  return Boolean(target.closest('[data-row-action]') || target.closest('[role=checkbox]'))
}

export function AdminOrdersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const q = useDebounce(search, 300)

  const query = useMemo(
    () => ({
      tab: tab === 'all' ? undefined : tab,
      q: q.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [tab, q, page],
  )

  const { data, isLoading } = useAdminOrders(query)
  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const updateStatus = useUpdateOrderStatus()
  const markPrinted = useMarkPackingSlipPrinted()
  const [handoffOrder, setHandoffOrder] = useState<Order | null>(null)
  const [deliverOrder, setDeliverOrder] = useState<Order | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [printing, setPrinting] = useState(false)

  const unprintedPackingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          PACKING_SLIP_STATUSES.includes(order.status) && !hasPackingSlipPrinted(order),
      ),
    [orders],
  )

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.has(order.id)),
    [orders, selectedIds],
  )

  const allVisibleSelected = orders.length > 0 && orders.every((order) => selectedIds.has(order.id))
  const someVisibleSelected = orders.some((order) => selectedIds.has(order.id))

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)
  const emptyState = getOrderTabEmptyState(tab, Boolean(q.trim()))
  const showNeedsActionHints = tab === 'needs_action'

  const updateSearchParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams)
    mutate(params)
    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    updateSearchParams((params) => {
      if (q.trim()) params.set('q', q.trim())
      else params.delete('q')
    })
  }, [q])

  useEffect(() => {
    if (!isLoading && page > pageCount) {
      updateSearchParams((params) => params.delete('page'))
    }
  }, [isLoading, page, pageCount])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [tab, q, page])

  const setTab = (nextTab: OrderTab) => {
    updateSearchParams((params) => {
      if (nextTab === 'all') params.delete('tab')
      else params.set('tab', nextTab)
      params.delete('page')
    })
  }

  const setPage = (nextPage: number) => {
    updateSearchParams((params) => {
      if (nextPage <= 1) params.delete('page')
      else params.set('page', String(nextPage))
    })
  }

  const patchLocalOrder = (orderId: string, patch: Partial<Order>) => {
    setHandoffOrder((current) => syncOrderInState(current, orderId, patch))
  }

  const orderDetailState = { backTo: `${location.pathname}${location.search}` }

  const openOrderDetail = (orderId: string) => {
    navigate(`/orders/${orderId}`, { state: orderDetailState })
  }

  const changeStatus = (
    order: Order,
    next: OrderStatus,
    extras?: { shippingCarrier?: ShippingCarrier; trackingNumber?: string },
  ) => {
    updateStatus.mutate(
      {
        id: order.id,
        status: next,
        shippingCarrier: extras?.shippingCarrier,
        trackingNumber: extras?.trackingNumber,
      },
      {
        onSuccess: (result) => {
          toast.success(`Đã cập nhật: ${ORDER_STATUS_LABELS[next]}`)
          const patch: Partial<Order> = {
            status: next,
            ...(extras?.shippingCarrier ? { shippingCarrier: extras.shippingCarrier } : {}),
            ...(extras?.trackingNumber ? { trackingNumber: extras.trackingNumber } : {}),
            ...(result.paymentStatus ? { paymentStatus: result.paymentStatus as Order['paymentStatus'] } : {}),
          }
          patchLocalOrder(order.id, patch)
          if (next === 'shipping') setHandoffOrder(null)
          if (next === 'delivered') setDeliverOrder(null)
        },
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

  const markSlipPrinted = async (order: Order) => {
    const result = await markPrinted.mutateAsync(order.id)
    patchLocalOrder(order.id, { packingSlipPrintedAt: result.packingSlipPrintedAt })
    return result
  }

  const printOrders = async (targets: Order[], emptyMessage: string) => {
    if (targets.length === 0) {
      toast.message(emptyMessage)
      return false
    }

    setPrinting(true)
    try {
      const ok = await printOrderSlips(targets)
      if (!ok) {
        toast.error('Trình duyệt chặn cửa sổ in. Hãy cho phép popup rồi thử lại.')
        return false
      }

      const printableOrders = targets.filter((order) => PACKING_SLIP_STATUSES.includes(order.status))
      if (printableOrders.length > 0) {
        const markResults = await Promise.allSettled(
          printableOrders.map((order) => markSlipPrinted(order)),
        )
        const markFailures = markResults.filter((result) => result.status === 'rejected')
        if (markFailures.length > 0) {
          toast.warning(
            markFailures.length === printableOrders.length
              ? 'Đã mở phiếu in nhưng chưa lưu trạng thái "đã in". Kiểm tra kết nối hoặc khởi động lại backend.'
              : `Đã in nhưng ${markFailures.length}/${printableOrders.length} đơn chưa được đánh dấu đã in.`,
          )
        }
      }

      toast.success(
        targets.length === 1
          ? `Đã mở phiếu in cho ${targets[0].id}`
          : `Đã mở ${targets.length} phiếu in`,
      )
      return true
    } catch (error) {
      toast.error(getErrorMessage(error))
      return false
    } finally {
      setPrinting(false)
    }
  }

  const openHandoff = (order: Order) => {
    setHandoffOrder(order)
  }

  const handoffPending =
    handoffOrder && updateStatus.isPending && updateStatus.variables?.id === handoffOrder.id

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, orderId: string) => {
    if (isInteractiveRowTarget(event.target as HTMLElement)) return
    openOrderDetail(orderId)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Đơn hàng</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `Hiển thị ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} / ${formatNumber(total)} đơn`
              : 'Xác nhận → đóng gói → in phiếu → bàn giao vận chuyển'}
          </p>
        </div>
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              updateSearchParams((params) => params.delete('page'))
            }}
            placeholder="Tìm mã đơn, SĐT, tên, sản phẩm…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="sticky top-14 z-30 -mx-4 space-y-3 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-sm lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap gap-2">
          {ORDER_TABS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={tab === value ? 'default' : 'outline'}
              onClick={() => setTab(value)}
            >
              {ORDER_TAB_LABELS[value]}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{ORDER_TAB_DESCRIPTIONS[tab]}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={printing || selectedOrders.length === 0}
            title="In các đơn bạn đã tick chọn trên trang này (có thể in lại phiếu đã in)"
            onClick={() => printOrders(selectedOrders, 'Chưa chọn đơn nào để in')}
          >
            <Printer className="size-4" />
            In phiếu đã chọn ({selectedOrders.length})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={printing || unprintedPackingOrders.length === 0}
            title="In hàng loạt mọi đơn đã xác nhận/đang gói chưa in phiếu trên trang này"
            onClick={() =>
              printOrders(
                unprintedPackingOrders,
                'Không có đơn chưa in phiếu trên trang hiện tại',
              )
            }
          >
            <Printer className="size-4" />
            In đơn chưa in phiếu ({unprintedPackingOrders.length})
          </Button>
        </div>
      </div>

      {isLoading ? (
        <OrderListSkeleton />
      ) : orders.length === 0 ? (
        <Card>
          <OrderListEmptyState title={emptyState.title} hint={emptyState.hint} />
        </Card>
      ) : (
        <>
          <Card className="hidden p-0 md:block">
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
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Ngày / Chờ</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const rowPending = updateStatus.isPending && updateStatus.variables?.id === order.id
                  const customizedItemCount = countCustomizedItems(order)
                  const waitSeverity = getOrderWaitSeverity(order)
                  const needsActionReasons = showNeedsActionHints
                    ? getNeedsActionReasons(order)
                    : []

                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={(event) => handleRowClick(event, order.id)}
                    >
                      <TableCell className="align-top">
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={(checked) => toggleOrder(order.id, checked === true)}
                          aria-label={`Chọn đơn ${order.id}`}
                        />
                      </TableCell>
                      <TableCell className="align-top font-medium">
                        <Link
                          to={`/orders/${order.id}`}
                          state={orderDetailState}
                          className="text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {order.id}
                        </Link>
                        {order.note?.trim() ? (
                          <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                            <MessageSquare className="size-3 shrink-0" />
                            <span className="line-clamp-1">{order.note.trim()}</span>
                          </div>
                        ) : null}
                        {order.status === 'processing' ? (
                          <div
                            className={cn(
                              'mt-1 text-xs',
                              hasPackingSlipPrinted(order)
                                ? 'text-green-700'
                                : 'font-medium text-amber-700',
                            )}
                          >
                            {hasPackingSlipPrinted(order) ? 'Đã in phiếu' : 'Chưa in phiếu'}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">{order.shippingAddress.name}</div>
                        <div className="text-sm text-muted-foreground">{order.shippingAddress.phone}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px] align-top text-sm text-muted-foreground">
                        <span className="line-clamp-2">{summarizeOrderItems(order.items)}</span>
                        {customizedItemCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="mt-1 border-violet-200 bg-violet-50 text-[11px] font-normal text-violet-800"
                          >
                            <Palette className="mr-1 size-3" />
                            {customizedItemCount === 1 ? 'Tùy chỉnh' : `${customizedItemCount} tùy chỉnh`}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-sm">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</div>
                        <div
                          className={cn(
                            'text-xs',
                            isAwaitingOnlinePayment(order)
                              ? 'font-medium text-amber-700'
                              : 'text-muted-foreground',
                          )}
                        >
                          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-muted-foreground">{formatDate(order.createdAt)}</div>
                        <div
                          className={cn(
                            'text-xs',
                            waitSeverity
                              ? WAIT_SEVERITY_CLASSES[waitSeverity]
                              : 'text-muted-foreground',
                          )}
                        >
                          {formatRelative(order.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right font-medium">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <OrderStatusBadge status={order.status} />
                          {hasPendingReturn(order) ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-700">
                              Chờ hoàn trả
                            </Badge>
                          ) : null}
                        </div>
                        {needsActionReasons.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {needsActionReasons.map((reason) => (
                              <Badge
                                key={reason}
                                variant="secondary"
                                className="text-[11px] font-normal"
                              >
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {order.trackingNumber ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {order.shippingCarrier
                              ? `${SHIPPING_CARRIER_LABELS[order.shippingCarrier]} · `
                              : ''}
                            {order.trackingNumber}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top" data-row-action>
                        <OrderRowAction
                          order={order}
                          pending={rowPending}
                          onAdvance={(next) => changeStatus(order, next)}
                          onHandoff={() => openHandoff(order)}
                          onDeliver={() => setDeliverOrder(order)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 md:hidden">
            {orders.map((order) => {
              const rowPending = updateStatus.isPending && updateStatus.variables?.id === order.id

              return (
                <OrderListMobileCard
                  key={order.id}
                  order={order}
                  selected={selectedIds.has(order.id)}
                  pending={rowPending}
                  showNeedsActionHints={showNeedsActionHints}
                  detailState={orderDetailState}
                  onToggleSelect={(checked) => toggleOrder(order.id, checked)}
                  onOpenDetail={() => openOrderDetail(order.id)}
                  onAdvance={(next) => changeStatus(order, next)}
                  onHandoff={() => openHandoff(order)}
                  onDeliver={() => setDeliverOrder(order)}
                />
              )
            })}
          </div>
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <OrderHandoffDialog
        order={handoffOrder}
        open={Boolean(handoffOrder)}
        onOpenChange={(open) => !open && setHandoffOrder(null)}
        pending={Boolean(handoffPending)}
        onConfirm={({ shippingCarrier, trackingNumber }) => {
          if (!handoffOrder) return
          changeStatus(handoffOrder, 'shipping', { shippingCarrier, trackingNumber })
        }}
      />

      <ConfirmDialog
        open={Boolean(deliverOrder)}
        onOpenChange={(open) => !open && setDeliverOrder(null)}
        title="Xác nhận đã giao hàng?"
        description={
          deliverOrder?.paymentMethod === 'cod'
            ? `Đơn ${deliverOrder.id} sẽ chuyển sang "Đã giao" và COD sẽ được đánh dấu đã thu tiền.`
            : `Đơn ${deliverOrder?.id ?? ''} sẽ chuyển sang trạng thái "Đã giao".`
        }
        confirmLabel="Đã giao"
        cancelLabel="Chưa"
        onConfirm={() => {
          if (!deliverOrder) return
          changeStatus(deliverOrder, 'delivered')
        }}
      />
    </div>
  )
}