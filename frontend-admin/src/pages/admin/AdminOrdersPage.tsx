import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { MessageSquare, Palette, Printer, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { AdminActiveFilterChips } from '@/components/admin/AdminActiveFilterChips'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { AdminFilterField } from '@/components/admin/AdminFilterField'
import { AdminFilterSelect } from '@/components/admin/AdminFilterSelect'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { OrderSort, OrderTab } from '@/lib/api/endpoints/orders'
import type { Order, OrderStatus, PaymentMethod, PaymentStatus, ShippingCarrier } from '@/types'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const PAGE_SIZE = 20

const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  cod: 'COD',
  vnpay: 'VNPay',
  payos: 'PayOS',
  credit: 'Công nợ',
}

const STICKY_ACTION_HEAD =
  'sticky right-0 z-10 bg-muted/95 shadow-[-6px_0_10px_-8px_rgba(0,0,0,0.15)] backdrop-blur-sm'
const STICKY_ACTION_CELL =
  'sticky right-0 z-10 bg-background shadow-[-6px_0_10px_-8px_rgba(0,0,0,0.12)] group-hover:bg-muted/50'

const ORDER_TABS: OrderTab[] = [
  'all',
  'pending',
  'needs_action',
  'packing',
  'shipping',
  'delivered',
  'cancelled',
]

const WAIT_SEVERITY_CLASSES = {
  normal: 'text-muted-foreground',
  warning: 'font-medium text-amber-700',
  urgent: 'font-semibold text-red-700',
} as const

const PAYMENT_METHOD_FILTERS: Array<{ value: PaymentMethod | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả PT thanh toán' },
  { value: 'cod', label: 'COD' },
  { value: 'vnpay', label: 'VNPay' },
  { value: 'payos', label: 'PayOS' },
]

const PAYMENT_STATUS_FILTERS: Array<{ value: PaymentStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả TT' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

const ORDER_SORT_OPTIONS: Array<{ value: OrderSort; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'total_desc', label: 'Tổng cao nhất' },
  { value: 'total_asc', label: 'Tổng thấp nhất' },
]

function parseTab(value: string | null): OrderTab {
  if (value === 'return_pending') return 'cancelled'
  if (value && ORDER_TABS.includes(value as OrderTab)) {
    return value as OrderTab
  }
  return 'all'
}

function parsePaymentMethod(value: string | null): PaymentMethod | 'all' {
  if (value === 'cod' || value === 'vnpay' || value === 'payos') return value
  return 'all'
}

function parsePaymentStatus(value: string | null): PaymentStatus | 'all' {
  if (value === 'pending' || value === 'paid' || value === 'failed' || value === 'refunded') {
    return value
  }
  return 'all'
}

function parseOrderSort(value: string | null): OrderSort {
  if (value === 'oldest' || value === 'total_desc' || value === 'total_asc') return value
  return 'newest'
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
  const paymentMethod = parsePaymentMethod(searchParams.get('paymentMethod'))
  const paymentStatus = parsePaymentStatus(searchParams.get('paymentStatus'))
  const sort = parseOrderSort(searchParams.get('sort'))
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const q = useDebounce(search, 300)

  const query = useMemo(
    () => ({
      tab: tab === 'all' ? undefined : tab,
      q: q.trim() || undefined,
      paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
      paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
      sort: sort === 'newest' ? undefined : sort,
      page,
      limit: PAGE_SIZE,
    }),
    [tab, q, paymentMethod, paymentStatus, sort, page],
  )

  const { data, isLoading, isFetching, refetch } = useAdminOrders(query)
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
  const hasExtraFilters =
    paymentMethod !== 'all' || paymentStatus !== 'all' || sort !== 'newest'
  const hasActiveFilters = Boolean(q.trim()) || hasExtraFilters
  const emptyState = getOrderTabEmptyState(tab, hasActiveFilters)
  const showNeedsActionHints = tab === 'needs_action'
  const showShippingColumn = tab === 'shipping'

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
  }, [tab, q, page, paymentMethod, paymentStatus, sort])

  const setFilterParam = (key: string, value: string) => {
    updateSearchParams((params) => {
      if (value === 'all' || (key === 'sort' && value === 'newest')) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      params.delete('page')
    })
  }

  const resetFilters = () => {
    setSearch('')
    updateSearchParams((params) => {
      params.delete('q')
      params.delete('paymentMethod')
      params.delete('paymentStatus')
      params.delete('sort')
      params.delete('page')
    })
  }

  const filterChips = [
    q.trim()
      ? {
          key: 'q',
          label: `Tìm: "${q.trim()}"`,
          onRemove: () => setSearch(''),
        }
      : null,
    paymentMethod !== 'all'
      ? {
          key: 'paymentMethod',
          label: PAYMENT_METHOD_LABELS[paymentMethod],
          onRemove: () => setFilterParam('paymentMethod', 'all'),
        }
      : null,
    paymentStatus !== 'all'
      ? {
          key: 'paymentStatus',
          label: PAYMENT_STATUS_LABELS[paymentStatus],
          onRemove: () => setFilterParam('paymentStatus', 'all'),
        }
      : null,
    sort !== 'newest'
      ? {
          key: 'sort',
          label: ORDER_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort,
          onRemove: () => setFilterParam('sort', 'newest'),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>

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
    <div className="space-y-5">
      <AdminPageHeader
        title="Đơn hàng"
        description={
          total > 0
            ? `Hiển thị ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} / ${formatNumber(total)} đơn`
            : 'Xác nhận → đóng gói → in phiếu → bàn giao vận chuyển'
        }
      />

      <AdminListToolbar
        sticky
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          updateSearchParams((params) => params.delete('page'))
        }}
        searchPlaceholder="Tìm mã đơn, SĐT, tên, sản phẩm…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        activeFilterCount={filterChips.filter((chip) => chip.key !== 'q').length}
        footer={
          <div className="space-y-2">
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
            <AdminActiveFilterChips chips={filterChips} onClearAll={hasActiveFilters ? resetFilters : undefined} />
          </div>
        }
        filters={
          <>
            <AdminFilterField label="Phương thức thanh toán">
              <AdminFilterSelect
                value={paymentMethod}
                onValueChange={(value) => setFilterParam('paymentMethod', value)}
                options={PAYMENT_METHOD_FILTERS}
              />
            </AdminFilterField>
            <AdminFilterField label="Trạng thái thanh toán">
              <AdminFilterSelect
                value={paymentStatus}
                onValueChange={(value) => setFilterParam('paymentStatus', value)}
                options={PAYMENT_STATUS_FILTERS}
              />
            </AdminFilterField>
            <AdminFilterField label="Sắp xếp">
              <AdminFilterSelect
                value={sort}
                onValueChange={(value) => setFilterParam('sort', value)}
                options={ORDER_SORT_OPTIONS}
              />
            </AdminFilterField>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5">
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

      {isLoading ? (
        <OrderListSkeleton />
      ) : orders.length === 0 ? (
        <AdminDataPanel>
          <OrderListEmptyState title={emptyState.title} hint={emptyState.hint} />
        </AdminDataPanel>
      ) : (
        <>
          <AdminDataPanel className="hidden lg:block">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-10" />
                <col className={showShippingColumn ? 'w-[min(28%,240px)]' : 'w-[min(32%,280px)]'} />
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className={showShippingColumn ? 'w-[min(16%,140px)]' : 'w-[min(22%,200px)]'} />
                {showShippingColumn ? <col className="w-[min(18%,160px)]" /> : null}
                <col className="w-[88px]" />
              </colgroup>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                      onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                      aria-label="Chọn tất cả đơn hiển thị"
                    />
                  </TableHead>
                  <TableHead className="whitespace-normal">Đơn hàng</TableHead>
                  <TableHead className="whitespace-normal">Thanh toán</TableHead>
                  <TableHead className="whitespace-normal">Thời gian</TableHead>
                  <TableHead className="whitespace-normal">Trạng thái</TableHead>
                  {showShippingColumn ? (
                    <TableHead className="whitespace-normal">Vận chuyển</TableHead>
                  ) : null}
                  <TableHead className={cn('text-right whitespace-normal', STICKY_ACTION_HEAD)}>
                    Thao tác
                  </TableHead>
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
                  const visibleReasons = needsActionReasons.slice(0, 2)
                  const hiddenReasonCount = needsActionReasons.length - visibleReasons.length

                  return (
                    <TableRow
                      key={order.id}
                      className="group cursor-pointer"
                      onClick={(event) => handleRowClick(event, order.id)}
                    >
                      <TableCell className="align-top whitespace-normal">
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={(checked) => toggleOrder(order.id, checked === true)}
                          aria-label={`Chọn đơn ${order.id}`}
                        />
                      </TableCell>
                      <TableCell className="min-w-0 align-top whitespace-normal">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <Link
                            to={`/orders/${order.id}`}
                            state={orderDetailState}
                            className="font-medium text-primary hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {order.id}
                          </Link>
                          <span className="text-sm text-muted-foreground">
                            {order.shippingAddress.name}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {order.shippingAddress.phone}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {summarizeOrderItems(order.items)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="max-w-full cursor-default border-amber-200 bg-amber-50 text-[11px] font-normal text-amber-800"
                                >
                                  <MessageSquare className="mr-1 size-3 shrink-0" />
                                  <span className="truncate">{order.note.trim()}</span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {order.note.trim()}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          {order.status === 'processing' ? (
                            <span
                              className={cn(
                                'text-[11px]',
                                hasPackingSlipPrinted(order)
                                  ? 'text-green-700'
                                  : 'font-medium text-amber-700',
                              )}
                            >
                              {hasPackingSlipPrinted(order) ? 'Đã in phiếu' : 'Chưa in phiếu'}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <div className="font-medium">{formatCurrency(order.total)}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {PAYMENT_METHOD_SHORT[order.paymentMethod]}
                        </div>
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
                      <TableCell className="align-top whitespace-normal">
                        <div className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</div>
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
                      <TableCell className="min-w-0 align-top whitespace-normal">
                        <div className="flex flex-wrap items-center gap-1">
                          <OrderStatusBadge status={order.status} />
                          {hasPendingReturn(order) ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-700">
                              Hoàn trả
                            </Badge>
                          ) : null}
                          {visibleReasons.map((reason) => (
                            <Badge key={reason} variant="secondary" className="text-[11px] font-normal">
                              {reason}
                            </Badge>
                          ))}
                          {hiddenReasonCount > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="cursor-default text-[11px] font-normal">
                                  +{hiddenReasonCount}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {needsActionReasons.slice(2).join(' · ')}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                        {!showShippingColumn && order.trackingNumber ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Truck className="size-3 shrink-0" />
                                <span className="truncate">
                                  {order.shippingCarrier
                                    ? `${SHIPPING_CARRIER_LABELS[order.shippingCarrier]} · `
                                    : ''}
                                  {order.trackingNumber}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {order.shippingCarrier
                                ? `${SHIPPING_CARRIER_LABELS[order.shippingCarrier]} · `
                                : ''}
                              {order.trackingNumber}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      {showShippingColumn ? (
                        <TableCell className="min-w-0 align-top whitespace-normal">
                          {order.trackingNumber ? (
                            <>
                              {order.shippingCarrier ? (
                                <div className="text-xs font-medium">
                                  {SHIPPING_CARRIER_LABELS[order.shippingCarrier]}
                                </div>
                              ) : null}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Truck className="size-3 shrink-0" />
                                    <span className="line-clamp-2 break-all">{order.trackingNumber}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs break-all">
                                  {order.trackingNumber}
                                </TooltipContent>
                              </Tooltip>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Chưa có mã</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell
                        className={cn('align-top whitespace-normal', STICKY_ACTION_CELL)}
                        data-row-action
                      >
                        <OrderRowAction
                          order={order}
                          pending={rowPending}
                          compact
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
          </AdminDataPanel>

          <div className="space-y-3 lg:hidden">
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