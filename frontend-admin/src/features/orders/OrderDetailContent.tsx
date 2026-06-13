import { Download, MapPin, MessageSquare, Package, Palette, RotateCcw, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/format'
import {
  CUSTOMIZATION_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  RETURN_STATUS_LABELS,
  SHIPPING_CARRIER_LABELS,
  SHIPPING_OPTIONS,
} from '@/lib/constants'
import { useUpdateCustomizationStatus } from '@/features/orders/api'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/axios'
import type { CustomizationStatus } from '@/types'
import {
  hasPackingSlipPrinted,
  hasPendingReturn,
  isAwaitingOnlinePayment,
} from '@/features/orders/order-helpers'
import { cn } from '@/lib/utils'
import type { Order, OrderItem } from '@/types'

interface OrderDetailContentProps {
  order: Order
}

function getShippingMethodLabel(method: Order['shippingMethod']): string {
  const option = SHIPPING_OPTIONS.find((o) => o.value === method)
  return option ? `${option.label} · ${option.eta}` : method
}

function formatAddress(order: Order): string {
  const { street, ward, district, city } = order.shippingAddress
  return [street, ward, district, city].filter(Boolean).join(', ')
}

function getCustomizedItems(items: OrderItem[]): OrderItem[] {
  return items.filter((item) => Boolean(item.customization))
}

function downloadCustomizationImage(orderId: string, imageSrc: string, item: { productName: string }) {
  if (!imageSrc) return

  const isDataUrl = imageSrc.startsWith('data:image/')
  const safeProduct = item.productName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
  const filenameBase = `${orderId}-${safeProduct}-custom`

  const link = document.createElement('a')
  link.href = imageSrc
  link.target = '_blank'

  if (isDataUrl) {
    let ext = 'png'
    if (imageSrc.startsWith('data:image/jpeg') || imageSrc.startsWith('data:image/jpg')) ext = 'jpg'
    else if (imageSrc.startsWith('data:image/webp')) ext = 'webp'
    else if (imageSrc.startsWith('data:image/gif')) ext = 'gif'
    link.download = `${filenameBase}.${ext}`
  } else {
    link.download = filenameBase
  }

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function OrderDetailHeader({ order }: { order: Order }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const customizedCount = getCustomizedItems(order.items).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-mono text-2xl font-bold tracking-tight">{order.id}</h1>
        <OrderStatusBadge status={order.status} />
        {hasPendingReturn(order) ? (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            Chờ hoàn trả
          </Badge>
        ) : null}
        {customizedCount > 0 ? (
          <Badge className="border-0 bg-violet-100 text-violet-800 hover:bg-violet-100">
            <Palette className="mr-1 size-3" />
            {customizedCount} tùy chỉnh
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Đặt lúc {formatDateTime(order.createdAt)}</span>
        <span className="hidden sm:inline text-border">|</span>
        <span>
          {order.items.length} sản phẩm · {itemCount} món
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <MetaChip
          label={PAYMENT_METHOD_LABELS[order.paymentMethod]}
          value={PAYMENT_STATUS_LABELS[order.paymentStatus]}
          highlight={isAwaitingOnlinePayment(order)}
        />
        {order.status === 'processing' ? (
          <MetaChip
            label="Phiếu đóng gói"
            value={hasPackingSlipPrinted(order) ? 'Đã in' : 'Chưa in'}
            highlight={!hasPackingSlipPrinted(order)}
          />
        ) : null}
        {order.trackingNumber ? (
          <MetaChip
            label={order.shippingCarrier ? SHIPPING_CARRIER_LABELS[order.shippingCarrier] : 'Vận đơn'}
            value={order.trackingNumber}
          />
        ) : null}
        {order.quotationId ? (
          <MetaChip label="Báo giá (cũ)" value={order.quotationId} />
        ) : null}
      </div>
    </div>
  )
}

export function OrderDetailContent({ order }: OrderDetailContentProps) {
  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const customizedCount = getCustomizedItems(order.items).length

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-primary" />
              Sản phẩm
              <Badge variant="secondary" className="ml-auto font-normal">
                {order.items.length} dòng · {totalQty} món
                {customizedCount > 0 ? ` · ${customizedCount} tùy chỉnh` : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item, idx) => (
              <OrderItemRow
                key={idx}
                orderId={order.id}
                item={item}
                isLast={idx === order.items.length - 1}
              />
            ))}
          </CardContent>
        </Card>

        {order.note?.trim() ? (
          <Card className="border-amber-200/80 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                <MessageSquare className="size-4" />
                Ghi chú khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-amber-950">{order.note.trim()}</p>
            </CardContent>
          </Card>
        ) : null}

        {order.timeline.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lịch sử đơn hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-0">
                {order.timeline.map((entry, index) => {
                  const isLast = index === order.timeline.length - 1
                  return (
                    <li key={`${entry.status}-${entry.date}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                      {!isLast ? (
                        <span
                          className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={cn(
                          'relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 bg-background text-[10px] font-bold',
                          index === order.timeline.length - 1
                            ? 'border-primary text-primary'
                            : 'border-muted-foreground/30 text-muted-foreground',
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-medium">{ORDER_STATUS_LABELS[entry.status]}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(entry.date)}</p>
                        {entry.note ? (
                          <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        ) : null}

        {order.returnRequest ? (
          <Card className="border-amber-200/60 xl:hidden">
            <ReturnRequestSection order={order} />
          </Card>
        ) : null}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-primary" />
              Người nhận
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{order.shippingAddress.name}</p>
            <p className="font-mono text-muted-foreground">{order.shippingAddress.phone}</p>
            <p className="leading-relaxed text-muted-foreground">{formatAddress(order)}</p>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              Giao hàng:{' '}
              <span className="font-medium text-foreground">{getShippingMethodLabel(order.shippingMethod)}</span>
            </p>
          </CardContent>
        </Card>

        {order.shippingCarrier || order.trackingNumber ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4 text-primary" />
                Vận chuyển
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.shippingCarrier ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Đơn vị</span>
                  <span className="font-medium">{SHIPPING_CARRIER_LABELS[order.shippingCarrier]}</span>
                </div>
              ) : null}
              {order.trackingNumber ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Mã vận đơn</span>
                  <span className="font-mono text-xs font-medium">{order.trackingNumber}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SummaryRow label="Tạm tính" value={formatCurrency(order.subtotal)} />
            <SummaryRow label="Phí vận chuyển" value={formatCurrency(order.shippingFee)} />
            {order.discount > 0 ? (
              <SummaryRow label="Giảm giá" value={`−${formatCurrency(order.discount)}`} className="text-green-700" />
            ) : null}
            {order.voucherCode ? <SummaryRow label="Voucher" value={order.voucherCode} mono /> : null}
            <Separator className="my-2" />
            <SummaryRow label="Tổng cộng" value={formatCurrency(order.total)} bold />
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Hình thức</p>
              <p className="font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
              <p
                className={cn(
                  'text-xs',
                  isAwaitingOnlinePayment(order) ? 'font-medium text-amber-700' : 'text-muted-foreground',
                )}
              >
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </p>
            </div>
          </CardContent>
        </Card>

        {order.returnRequest ? (
          <Card className="hidden border-amber-200/60 xl:block">
            <ReturnRequestSection order={order} />
          </Card>
        ) : null}
      </aside>
    </div>
  )
}

function OrderItemRow({
  orderId,
  item,
  isLast,
}: {
  orderId: string
  item: OrderItem
  isLast: boolean
}) {
  const updateCustomization = useUpdateCustomizationStatus()
  const customization = item.customization
  const isImagePrint = customization?.inputType === 'image' && Boolean(customization.text)

  const setCustomizationStatus = (status: CustomizationStatus) => {
    if (!item.id) return
    updateCustomization.mutate(
      { orderId, itemId: item.id, status },
      {
        onSuccess: () => toast.success('Đã cập nhật trạng thái tùy chỉnh'),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <div className={cn('pb-3', !isLast && 'border-b border-border/60')}>
      <div className="flex gap-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
          {item.productImage ? (
            <img
              src={item.productImage}
              alt={`Ảnh sản phẩm ${item.productName}`}
              title="Ảnh sản phẩm trên cửa hàng"
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <Package className="size-5 opacity-40" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium leading-snug">{item.productName}</p>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(item.price)} × {item.quantity}
            {item.packagingUnit ? ` · ${item.packagingQty} ${item.packagingUnit}` : ''}
            {customization?.extraPrice ? ` · +${formatCurrency(customization.extraPrice)} tùy chỉnh` : ''}
          </p>

          {customization ? (
            <div className="rounded-md bg-muted/50 px-2.5 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">
                  Tùy chỉnh: {customization.type}
                </p>
                {item.customizationStatus ? (
                  <Badge variant="outline">
                    {CUSTOMIZATION_STATUS_LABELS[item.customizationStatus]}
                  </Badge>
                ) : null}
              </div>

              {customization.inputType === 'text' && customization.text ? (
                <p className="mt-1 text-muted-foreground">
                  Chữ in: <span className="font-medium text-foreground">“{customization.text}”</span>
                </p>
              ) : null}

              {isImagePrint ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">File in khách upload:</span>
                  <a
                    href={customization.text}
                    target="_blank"
                    rel="noreferrer"
                    title="File ảnh khách gửi để in lên sản phẩm"
                  >
                    <img
                      src={customization.text}
                      alt="File in khách upload"
                      className="size-10 rounded border object-cover"
                    />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => downloadCustomizationImage(orderId, customization.text, item)}
                  >
                    <Download className="size-3" />
                    Tải file in
                  </Button>
                </div>
              ) : null}

              {customization.inputType === 'image' && !customization.text ? (
                <p className="mt-1 text-muted-foreground">Khách chưa upload file in.</p>
              ) : null}

              {customization.inputType === 'text' && !customization.text ? (
                <p className="mt-1 text-muted-foreground">Khách chưa nhập nội dung in.</p>
              ) : null}

              {item.id ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="secondary" className="h-7 px-2" onClick={() => setCustomizationStatus('approved')}>
                    Duyệt mẫu
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => setCustomizationStatus('rejected')}>
                    Từ chối
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => setCustomizationStatus('in_production')}>
                    Sản xuất
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => setCustomizationStatus('completed')}>
                    Hoàn tất
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ReturnRequestSection({ order }: { order: Order }) {
  if (!order.returnRequest) return null

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <RotateCcw className="size-4" />
          Yêu cầu hoàn trả
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Lý do: </span>
          {order.returnRequest.reason}
        </p>
        <p>
          <span className="text-muted-foreground">Trạng thái: </span>
          <span className="font-medium">{RETURN_STATUS_LABELS[order.returnRequest.status]}</span>
        </p>
        {order.returnRequest.createdAt ? (
          <p className="text-xs text-muted-foreground">
            Gửi lúc {formatDateTime(order.returnRequest.createdAt)}
          </p>
        ) : null}
      </CardContent>
    </>
  )
}

function MetaChip({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
        highlight ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-border bg-muted/40 text-foreground',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  bold,
  mono,
  className,
}: {
  label: string
  value: string
  bold?: boolean
  mono?: boolean
  className?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          bold && 'text-base font-bold text-primary',
          !bold && 'font-medium',
          mono && 'font-mono text-xs',
          className,
        )}
      >
        {value}
      </span>
    </div>
  )
}