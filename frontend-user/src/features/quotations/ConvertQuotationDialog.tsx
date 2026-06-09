import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { AddressFormDialog } from '@/features/account/AddressFormDialog'
import { QuotationItemsList } from '@/features/quotations/QuotationItemsList'
import { useConvertQuotation } from '@/features/quotations/api'
import { useBusinessProfile } from '@/features/business/api'
import { useAuthStore } from '@/stores/auth-store'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PaymentMethod, Quotation } from '@/types'

interface ConvertQuotationDialogProps {
  quotation: Quotation | null
  onOpenChange: (open: boolean) => void
  onConverted?: (orderId: string) => void
}

export function ConvertQuotationDialog({
  quotation,
  onOpenChange,
  onConverted,
}: ConvertQuotationDialogProps) {
  const user = useAuthStore((s) => s.user)
  const convert = useConvertQuotation()
  const { data: businessData } = useBusinessProfile()
  const addresses = user?.addresses ?? []
  const defaultAddressId = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id

  const [addressId, setAddressId] = useState<string | undefined>(defaultAddressId)
  const [payment, setPayment] = useState<PaymentMethod>('credit')
  const [note, setNote] = useState('')
  const [addressDialog, setAddressDialog] = useState(false)

  const canUseCredit = Boolean(
    businessData?.profile?.status === 'approved' && businessData.profile.paymentTermDays > 0,
  )

  const selectedAddress = addresses.find((a) => a.id === addressId)
  const paymentOptions = useMemo(
    () =>
      (['cod', 'credit'] as PaymentMethod[]).filter(
        (method) => method !== 'credit' || canUseCredit,
      ),
    [canUseCredit],
  )

  const exceedsCredit =
    canUseCredit &&
    payment === 'credit' &&
    businessData?.availableCredit != null &&
    quotation != null &&
    quotation.total > businessData.availableCredit

  const handleSubmit = () => {
    if (!quotation) return
    if (!selectedAddress) {
      toast.error('Vui lòng chọn địa chỉ giao hàng')
      return
    }
    if (exceedsCredit) {
      toast.error('Đơn hàng vượt hạn mức công nợ còn lại')
      return
    }

    convert.mutate(
      {
        id: quotation.id,
        shippingAddress: selectedAddress,
        paymentMethod: payment,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(`${res.message} — ${res.orderId}`)
          onOpenChange(false)
          onConverted?.(res.orderId)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <>
      <Dialog open={Boolean(quotation)} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {quotation ? (
            <>
              <DialogHeader>
                <DialogTitle>Chuyển báo giá thành đơn hàng</DialogTitle>
                <DialogDescription>
                  {quotation.code} · {formatCurrency(quotation.total)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <section className="space-y-2">
                  <h4 className="font-semibold">Sản phẩm</h4>
                  <QuotationItemsList items={quotation.items} compact />
                </section>

                <Separator />

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Địa chỉ giao hàng</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setAddressDialog(true)}>
                      <Plus className="size-3.5" /> Thêm địa chỉ
                    </Button>
                  </div>
                  {addresses.length === 0 ? (
                    <p className="text-muted-foreground">Chưa có địa chỉ. Vui lòng thêm địa chỉ giao hàng.</p>
                  ) : (
                    <RadioGroup value={addressId} onValueChange={setAddressId} className="space-y-2">
                      {addresses.map((address) => (
                        <label
                          key={address.id}
                          className={cn(
                            'flex cursor-pointer gap-3 rounded-lg border p-3',
                            addressId === address.id && 'border-primary bg-primary/5',
                          )}
                        >
                          <RadioGroupItem value={address.id} className="mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium">{address.name} · {address.phone}</p>
                            <p className="text-muted-foreground">
                              {address.street}, {address.ward}, {address.district}, {address.city}
                            </p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                </section>

                <section className="space-y-2">
                  <Label>Phương thức thanh toán</Label>
                  <RadioGroup
                    value={payment}
                    onValueChange={(value) => setPayment(value as PaymentMethod)}
                    className="space-y-2"
                  >
                    {paymentOptions.map((method) => (
                      <label
                        key={method}
                        className={cn(
                          'flex cursor-pointer gap-3 rounded-lg border p-3',
                          payment === method && 'border-primary bg-primary/5',
                        )}
                      >
                        <RadioGroupItem value={method} className="mt-0.5" />
                        <span>{PAYMENT_METHOD_LABELS[method]}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  {exceedsCredit ? (
                    <p className="text-xs text-destructive">
                      Vượt hạn mức công nợ còn lại ({formatCurrency(businessData?.availableCredit ?? 0)}).
                    </p>
                  ) : null}
                </section>

                <section className="space-y-2">
                  <Label htmlFor="convert-note">Ghi chú đơn hàng</Label>
                  <Textarea
                    id="convert-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={quotation.note ?? 'Ghi chú thêm cho đơn hàng...'}
                    rows={2}
                  />
                </section>

                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatCurrency(quotation.subtotal)}</span>
                  </div>
                  {quotation.discount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chiết khấu</span>
                      <span>−{formatCurrency(quotation.discount)}</span>
                    </div>
                  ) : null}
                  <div className="mt-1 flex justify-between font-semibold">
                    <span>Tổng thanh toán</span>
                    <span className="text-primary">{formatCurrency(quotation.total)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={convert.isPending || !selectedAddress}>
                  {convert.isPending ? 'Đang xử lý...' : 'Xác nhận chuyển đơn'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AddressFormDialog open={addressDialog} onOpenChange={setAddressDialog} />
    </>
  )
}