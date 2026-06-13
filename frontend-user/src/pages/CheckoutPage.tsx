import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { AddressFormDialog } from '@/features/account/AddressFormDialog'
import { VoucherInput, type AppliedVoucher } from '@/features/vouchers/VoucherInput'
import { useCreateOrder } from '@/features/orders/api'
import { useBusinessProfile } from '@/features/business/api'
import { useCartStore, selectCartSubtotal, cartItemTotal } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import {
  PAYMENT_METHOD_LABELS,
  SHIPPING_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Address, PaymentMethod, ShippingMethod } from '@/types'

export function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore(selectCartSubtotal)
  const clearCart = useCartStore((s) => s.clear)
  const user = useAuthStore((s) => s.user)
  const createOrder = useCreateOrder()
  const { data: businessData } = useBusinessProfile()

  const addresses = user?.addresses ?? []
  const defaultAddressId = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id

  const [addressId, setAddressId] = useState<string | undefined>(defaultAddressId)
  const [shipping, setShipping] = useState<ShippingMethod>('standard')
  const [payment, setPayment] = useState<PaymentMethod>('cod')
  const [note, setNote] = useState('')
  const [voucher, setVoucher] = useState<AppliedVoucher | null>(null)
  const [addressDialog, setAddressDialog] = useState(false)
  const [requestInvoice, setRequestInvoice] = useState(false)

  const selectedAddress = addresses.find((a) => a.id === addressId)
  const shippingOption = SHIPPING_OPTIONS.find((s) => s.value === shipping)!
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shippingOption.fee
  const discount = voucher?.discount ?? 0
  const total = Math.max(0, subtotal + shippingFee - discount)

  const itemsPayload = useMemo(
    () =>
      items.map((i) => ({
        productId: i.productId,
        productName: i.name,
        productImage: i.image,
        price: i.unitPrice,
        quantity: i.quantity,
        packagingUnit: i.packagingUnit,
        packagingQty: i.packagingQty,
        customization: i.customization ?? undefined,
      })),
    [items],
  )

  if (items.length === 0) {
    return (
      <PageContainer>
        <EmptyState title="Giỏ hàng trống" description="Thêm sản phẩm trước khi thanh toán." />
      </PageContainer>
    )
  }

  const submit = () => {
    if (!selectedAddress) {
      toast.error('Vui lòng chọn địa chỉ giao hàng')
      return
    }
    const shippingAddress: Address = selectedAddress
    createOrder.mutate(
      {
        items: itemsPayload,
        shippingAddress,
        paymentMethod: payment,
        shippingMethod: shipping,
        voucherCode: voucher?.voucher.code,
        note: note.trim() || undefined,
        shippingFee,
        discount,
        invoiceInfo: requestInvoice
          ? {
              taxCode: businessData?.profile?.taxCode ?? undefined,
              companyName: businessData?.profile?.companyName,
              invoiceAddress: businessData?.profile?.invoiceAddress ?? undefined,
            }
          : undefined,
      },
      {
        onSuccess: (result) => {
          // Gateway methods return a payment URL to redirect the browser to.
          if (result.paymentUrl) {
            clearCart()
            window.location.assign(result.paymentUrl)
            return
          }
          clearCart()
          toast.success('Đặt hàng thành công!')
          navigate('/orders')
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <PageContainer className="space-y-6">
      <h1 className="text-2xl font-bold">Thanh toán</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {/* Address */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Địa chỉ giao hàng</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddressDialog(true)}>
                <Plus className="size-4" /> Thêm
              </Button>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Bạn chưa có địa chỉ. Vui lòng thêm địa chỉ giao hàng.
                </p>
              ) : (
                <RadioGroup value={addressId} onValueChange={setAddressId} className="space-y-2">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-lg border p-3 text-sm',
                        addressId === addr.id ? 'border-primary bg-primary/5' : 'border-border',
                      )}
                    >
                      <RadioGroupItem value={addr.id} className="mt-1" />
                      <div>
                        <p className="font-medium">
                          {addr.name} · {addr.phone}
                          {addr.isDefault ? (
                            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                              Mặc định
                            </span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground">
                          {addr.street}, {addr.ward}, {addr.district}, {addr.city}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phương thức vận chuyển</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={shipping} onValueChange={(v) => setShipping(v as ShippingMethod)} className="space-y-2">
                {SHIPPING_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm',
                      shipping === opt.value ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <RadioGroupItem value={opt.value} />
                      <span>
                        <span className="font-medium">{opt.label}</span>
                        <span className="ml-2 text-muted-foreground">{opt.eta}</span>
                      </span>
                    </span>
                    <span className="font-medium">{formatCurrency(opt.fee)}</span>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="space-y-2">
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[])
                  .filter((method) => method !== 'credit')
                  .map((method) => (
                  <label
                    key={method}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm',
                      payment === method ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <RadioGroupItem value={method} />
                    {PAYMENT_METHOD_LABELS[method]}
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {businessData?.profile?.status === 'approved' ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Hóa đơn VAT</CardTitle></CardHeader>
              <CardContent>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requestInvoice}
                    onChange={(e) => setRequestInvoice(e.target.checked)}
                  />
                  Yêu cầu xuất hóa đơn VAT cho đơn hàng này
                </label>
              </CardContent>
            </Card>
          ) : null}

          {/* Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ghi chú</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="note" className="sr-only">Ghi chú</Label>
              <Textarea
                id="note"
                placeholder="Ghi chú cho đơn hàng (tùy chọn)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold">Đơn hàng ({items.length})</h2>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {items.map((i) => (
                <li key={i.lineId} className="flex justify-between gap-2">
                  <span className="line-clamp-1 text-muted-foreground">
                    {i.name} × {i.quantity}
                  </span>
                  <span className="shrink-0 font-medium">{formatCurrency(cartItemTotal(i))}</span>
                </li>
              ))}
            </ul>
            <Separator />
            <VoucherInput subtotal={subtotal} applied={voucher} onApply={setVoucher} />
            <Separator />
            <div className="space-y-1.5 text-sm">
              <Row label="Tạm tính" value={formatCurrency(subtotal)} />
              <Row label="Phí vận chuyển" value={shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)} />
              {discount > 0 ? <Row label="Giảm giá" value={`−${formatCurrency(discount)}`} /> : null}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Tổng cộng</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={submit} disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Đang xử lý…' : 'Đặt hàng'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Tổng tiền cuối cùng được xác nhận bởi hệ thống khi xử lý đơn.
            </p>
          </CardContent>
        </Card>
      </div>

      <AddressFormDialog open={addressDialog} onOpenChange={setAddressDialog} />
    </PageContainer>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
