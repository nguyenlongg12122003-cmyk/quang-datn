import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Banknote, Clock, Minus, Plus, Printer, QrCode, ScanBarcode, ShoppingCart, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useCancelPosPayosOrder, useCreatePosOrder, usePendingPosPayosOrders } from '@/features/pos/api'
import { printPosReceipt, toReceiptData } from '@/features/pos/pos-receipt'
import {
  calcCartSubtotal,
  calcCartTotal,
  getPosUnitPrice,
  mergeCartLine,
  productToCartLine,
  updateCartQuantity,
  type PosCartLine,
  type PosPaymentMethod,
} from '@/features/pos/pos-helpers'
import { inventoryApi } from '@/lib/api/endpoints/inventory'
import { orderApi } from '@/lib/api/endpoints/orders'
import { catalogApi } from '@/lib/api/endpoints/catalog'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { CreatePosOrderResult, PendingPosOrder } from '@/lib/api/endpoints/pos'
import type { Product } from '@/types'

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function AdminPosPage() {
  const barcodeRef = useRef<HTMLInputElement>(null)
  const createOrder = useCreatePosOrder()
  const cancelPayos = useCancelPosPayosOrder()
  const { data: pendingPayos = [], refetch: refetchPendingPayos } = usePendingPosPayosOrders()

  const [cart, setCart] = useState<PosCartLine[]>([])
  const [autoPrint, setAutoPrint] = useState(true)
  const [barcode, setBarcode] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const debouncedSearch = useDebouncedValue(productSearch.trim())
  const [discount, setDiscount] = useState('0')
  const [note, setNote] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash')

  const [payosDialogOpen, setPayosDialogOpen] = useState(false)
  const [payosOrder, setPayosOrder] = useState<CreatePosOrderResult | null>(null)
  const [payosStatus, setPayosStatus] = useState<'waiting' | 'success' | 'failed'>('waiting')

  const [lastReceipt, setLastReceipt] = useState<CreatePosOrderResult | null>(null)
  const [cancelTarget, setCancelTarget] = useState<PendingPosOrder | CreatePosOrderResult | null>(null)

  const { data: searchResults } = useQuery({
    queryKey: ['pos', 'product-search', debouncedSearch],
    queryFn: () => catalogApi.listProducts({ q: debouncedSearch, limit: 8, page: 1 }),
    enabled: debouncedSearch.length >= 2,
  })

  const subtotal = calcCartSubtotal(cart)
  const discountAmount = Math.max(0, Number(discount) || 0)
  const total = calcCartTotal(subtotal, discountAmount)

  const focusBarcode = useCallback(() => {
    barcodeRef.current?.focus()
  }, [])

  const handlePrintReceipt = useCallback(async (order: CreatePosOrderResult, name?: string) => {
    const ok = await printPosReceipt(toReceiptData(order, name))
    if (!ok) {
      toast.error('Không mở được cửa sổ in. Cho phép popup hoặc bấm In bill thủ công.')
    }
  }, [])

  useEffect(() => {
    focusBarcode()
  }, [focusBarcode])

  const addProductToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Sản phẩm hết hàng')
      return
    }

    const line = productToCartLine(product)
    const existing = cart.find((item) => item.productId === line.productId)
    if (existing && existing.quantity >= existing.stock) {
      toast.error('Đã đạt tồn kho tối đa')
      return
    }

    setCart((prev) => mergeCartLine(prev, line))
    toast.success(`Đã thêm: ${product.name}`)
    setBarcode('')
    setProductSearch('')
    focusBarcode()
  }

  const lookupBarcode = async () => {
    const code = barcode.trim()
    if (!code) return
    try {
      const product = await inventoryApi.byBarcode(code)
      addProductToCart(product)
    } catch {
      toast.error('Không tìm thấy sản phẩm theo mã')
      focusBarcode()
    }
  }

  const resetSale = () => {
    setCart([])
    setDiscount('0')
    setNote('')
    setCustomerName('')
    setCustomerPhone('')
    setPaymentMethod('cash')
    setLastReceipt(null)
    setPayosOrder(null)
    setPayosStatus('waiting')
    setPayosDialogOpen(false)
    focusBarcode()
  }

  const completeCashSale = () => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }
    if (discountAmount > subtotal) {
      toast.error('Giảm giá không được lớn hơn tạm tính')
      return
    }

    createOrder.mutate(
      {
        items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        paymentMethod: 'cash',
        discount: discountAmount,
        note: note.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          setLastReceipt(result)
          setCart([])
          toast.success(`Thanh toán tiền mặt thành công — ${result.id}`)
          if (autoPrint) void handlePrintReceipt(result, customerName.trim() || undefined)
          void refetchPendingPayos()
          focusBarcode()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const startPayosSale = () => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }
    if (discountAmount > subtotal) {
      toast.error('Giảm giá không được lớn hơn tạm tính')
      return
    }

    createOrder.mutate(
      {
        items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        paymentMethod: 'payos',
        discount: discountAmount,
        note: note.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          if (!result.paymentUrl) {
            toast.error('Không tạo được liên kết PayOS')
            return
          }
          setPayosOrder(result)
          setPayosStatus('waiting')
          setPayosDialogOpen(true)
          window.open(result.paymentUrl, '_blank', 'noopener,noreferrer')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const completeSale = () => {
    if (paymentMethod === 'cash') completeCashSale()
    else startPayosSale()
  }

  useEffect(() => {
    if (!payosDialogOpen || !payosOrder || payosStatus !== 'waiting') return

    const orderCode = payosOrder.id.replace(/\D/g, '')
    const interval = window.setInterval(() => {
      orderApi
        .verifyPayos({ orderCode })
        .then((res) => {
          if (res.success) {
            const completed = { ...payosOrder, paymentStatus: 'paid' as const, status: 'delivered' }
            setPayosStatus('success')
            setLastReceipt(completed)
            setCart([])
            toast.success(`Thanh toán PayOS thành công — ${payosOrder.id}`)
            if (autoPrint) void handlePrintReceipt(completed, customerName.trim() || undefined)
            void refetchPendingPayos()
          }
        })
        .catch(() => {})
    }, 3000)

    return () => window.clearInterval(interval)
  }, [payosDialogOpen, payosOrder, payosStatus, autoPrint, customerName, handlePrintReceipt, refetchPendingPayos])

  const confirmCancelPayos = () => {
    if (!cancelTarget) return
    cancelPayos.mutate(
      { id: cancelTarget.id, reason: 'Nhân viên hủy đơn PayOS tại quầy' },
      {
        onSuccess: () => {
          toast.success(`Đã hủy đơn ${cancelTarget.id} — tồn kho đã hoàn trả`)
          if (payosOrder?.id === cancelTarget.id) {
            setPayosDialogOpen(false)
            setPayosOrder(null)
            setPayosStatus('waiting')
          }
          setCancelTarget(null)
          void refetchPendingPayos()
          focusBarcode()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bán hàng tại quầy"
        description="Quét barcode, tính bill và thanh toán tiền mặt hoặc QR PayOS. SP có tùy chỉnh bán theo giá lẻ (không in thêm tại quầy)."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanBarcode className="size-4" />
                Quét sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  ref={barcodeRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Quét barcode / SKU rồi Enter"
                  onKeyDown={(e) => e.key === 'Enter' && lookupBarcode()}
                  className="font-mono"
                />
                <Button variant="outline" onClick={lookupBarcode}>
                  Thêm
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Hoặc tìm theo tên / SKU</Label>
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Nhập tên sản phẩm..."
                />
                {debouncedSearch.length >= 2 && searchResults?.items.length ? (
                  <div className="max-h-40 overflow-y-auto rounded-lg border">
                    {searchResults.items.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60"
                        onClick={() => addProductToCart(product)}
                      >
                        <span className="min-w-0 truncate font-medium">{product.name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatCurrency(getPosUnitPrice(product))} · tồn {product.stock}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="size-4" />
                Giỏ hàng ({cart.length})
              </CardTitle>
              {cart.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                  <Trash2 className="mr-1 size-3.5" />
                  Xóa giỏ
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có sản phẩm. Quét barcode để bắt đầu.
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((line) => (
                    <div
                      key={line.productId}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      {line.image ? (
                        <img
                          src={line.image}
                          alt=""
                          className="size-12 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="size-12 rounded-md border bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.sku} · {formatCurrency(line.unitPrice)}
                          {line.isCustomizable ? ' · bán lẻ (không in thêm)' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            setCart((prev) => updateCartQuantity(prev, line.productId, line.quantity - 1))
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          disabled={line.quantity >= line.stock}
                          onClick={() =>
                            setCart((prev) => updateCartQuantity(prev, line.productId, line.quantity + 1))
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <p className="w-24 text-right text-sm font-semibold">
                        {formatCurrency(line.unitPrice * line.quantity)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground"
                        onClick={() =>
                          setCart((prev) => prev.filter((item) => item.productId !== line.productId))
                        }
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {lastReceipt ? (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    Đơn {lastReceipt.id} — {formatCurrency(lastReceipt.total)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lastReceipt.paymentMethod === 'cash' ? 'Tiền mặt' : 'PayOS'} · Đã hoàn tất
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handlePrintReceipt(lastReceipt, customerName.trim() || undefined)}
                  >
                    <Printer className="mr-1 size-3.5" />
                    In bill
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/orders/${lastReceipt.id}`}>Xem đơn</Link>
                  </Button>
                  <Button size="sm" onClick={resetSale}>
                    Đơn mới
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {pendingPayos.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-900 dark:text-amber-200">
                  <Clock className="size-4" />
                  PayOS chờ thanh toán ({pendingPayos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingPayos.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-background/80 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)} · {order.customerName}
                      </p>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(order.total)}</p>
                    </div>
                    <div className="flex gap-2">
                      {order.items[0] ? (
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {order.items.length} SP
                        </span>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => setCancelTarget(order)}
                      >
                        Hủy đơn
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle className="text-base">Thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Tên khách (tuỳ chọn)</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Khách lẻ" />
              </div>
              <div className="space-y-1.5">
                <Label>SĐT (tuỳ chọn)</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="09xx..." />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú đơn hàng..." />
            </div>

            <div className="space-y-1.5">
              <Label>Giảm giá (đ)</Label>
              <Input
                type="number"
                min={0}
                max={subtotal}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between text-green-700">
                  <span>Giảm giá</span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phương thức thanh toán</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="size-5" />
                  Tiền mặt
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'payos' ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => setPaymentMethod('payos')}
                >
                  <QrCode className="size-5" />
                  QR PayOS
                </Button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Tự động in bill sau khi thanh toán
            </label>

            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0 || createOrder.isPending}
              onClick={completeSale}
            >
              {createOrder.isPending
                ? 'Đang xử lý...'
                : paymentMethod === 'cash'
                  ? `Thu tiền mặt — ${formatCurrency(total)}`
                  : `Tạo QR PayOS — ${formatCurrency(total)}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={payosDialogOpen} onOpenChange={setPayosDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thanh toán PayOS</DialogTitle>
            <DialogDescription>
              Đã mở trang thanh toán PayOS. Khách quét QR trên trang đó để thanh toán.
            </DialogDescription>
          </DialogHeader>

          {payosOrder ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p>
                  Mã đơn: <span className="font-mono font-medium">{payosOrder.id}</span>
                </p>
                <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(payosOrder.total)}</p>
              </div>

              {payosStatus === 'waiting' ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <Badge variant="outline" className="animate-pulse border-amber-300 text-amber-700">
                    Đang chờ thanh toán
                  </Badge>
                  <span className="text-muted-foreground">Tự kiểm tra mỗi 3 giây</span>
                </div>
              ) : null}

              {payosStatus === 'success' ? (
                <p className="font-medium text-green-600">Thanh toán thành công!</p>
              ) : null}

              {payosOrder.paymentUrl ? (
                <Button asChild variant="outline" className="w-full">
                  <a href={payosOrder.paymentUrl} target="_blank" rel="noopener noreferrer">
                    Mở lại trang PayOS
                  </a>
                </Button>
              ) : null}

              {payosStatus === 'waiting' ? (
                <Button
                  variant="outline"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelTarget(payosOrder)}
                >
                  Hủy đơn PayOS
                </Button>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {payosStatus === 'success' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => payosOrder && void handlePrintReceipt(payosOrder, customerName.trim() || undefined)}
                >
                  <Printer className="mr-1 size-3.5" />
                  In bill
                </Button>
                <Button onClick={() => { setPayosDialogOpen(false); focusBarcode() }}>Đóng</Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setPayosDialogOpen(false)
                  toast.info('Đơn PayOS vẫn chờ thanh toán. Xem danh sách bên dưới để hủy nếu cần.')
                }}
              >
                Đóng (chờ sau)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => { if (!open) setCancelTarget(null) }}
        title="Hủy đơn PayOS tại quầy?"
        description={
          cancelTarget
            ? `Đơn ${cancelTarget.id} (${formatCurrency(cancelTarget.total)}) sẽ bị hủy và tồn kho được hoàn trả. Khách chưa thanh toán sẽ không bị trừ tiền.`
            : undefined
        }
        confirmLabel="Hủy đơn"
        destructive
        onConfirm={confirmCancelPayos}
      />
    </div>
  )
}