import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SHIPPING_CARRIER_OPTIONS } from '@/lib/constants'
import type { Order, ShippingCarrier } from '@/types'

interface OrderHandoffDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onConfirm: (payload: {
    shippingCarrier: ShippingCarrier
    trackingNumber: string
  }) => void
}

export function OrderHandoffDialog({
  order,
  open,
  onOpenChange,
  pending,
  onConfirm,
}: OrderHandoffDialogProps) {
  const [carrier, setCarrier] = useState<ShippingCarrier | ''>('')
  const [trackingNumber, setTrackingNumber] = useState('')

  useEffect(() => {
    if (!order || !open) return
    setCarrier(order.shippingCarrier ?? '')
    setTrackingNumber(order.trackingNumber ?? '')
  }, [order, open])

  const canSubmit =
    Boolean(order) && carrier && trackingNumber.trim().length >= 4 && !pending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle>Bàn giao đơn vị vận chuyển</DialogTitle>
              <DialogDescription>
                Đơn {order.id} đang đóng gói. Chọn đơn vị vận chuyển và nhập mã vận đơn trước khi
                bàn giao. Có thể in phiếu hàng loạt từ danh sách đơn trước hoặc sau bước này.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="handoff-carrier">Đơn vị vận chuyển</Label>
                <Select
                  value={carrier}
                  onValueChange={(value) => setCarrier(value as ShippingCarrier)}
                >
                  <SelectTrigger id="handoff-carrier">
                    <SelectValue placeholder="Chọn đơn vị vận chuyển" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_CARRIER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="handoff-tracking">Mã vận đơn</Label>
                <Input
                  id="handoff-tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Nhập mã vận đơn từ đơn vị ship"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button
                type="button"
                disabled={!canSubmit}
                onClick={() => {
                  if (!carrier) return
                  onConfirm({
                    shippingCarrier: carrier,
                    trackingNumber: trackingNumber.trim(),
                  })
                }}
              >
                Bàn giao · Đang giao
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}