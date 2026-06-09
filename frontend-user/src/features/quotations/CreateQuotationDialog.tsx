import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/format'

export interface CreateQuotationOptions {
  note?: string
  validDays?: number
  discount?: number
}

interface CreateQuotationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subtotal: number
  onSubmit: (options: CreateQuotationOptions) => void
  isPending?: boolean
}

export function CreateQuotationDialog({
  open,
  onOpenChange,
  subtotal,
  onSubmit,
  isPending = false,
}: CreateQuotationDialogProps) {
  const [note, setNote] = useState('')
  const [validDays, setValidDays] = useState('7')
  const [discount, setDiscount] = useState('0')

  const handleSubmit = () => {
    const parsedValidDays = Math.max(1, Number(validDays) || 7)
    const parsedDiscount = Math.max(0, Number(discount) || 0)
    onSubmit({
      note: note.trim() || undefined,
      validDays: parsedValidDays,
      discount: parsedDiscount,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo báo giá B2B</DialogTitle>
          <DialogDescription>
            Tạm tính giỏ hàng: {formatCurrency(subtotal)}. Báo giá sẽ được gửi cho admin duyệt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote-valid-days">Hiệu lực (ngày)</Label>
            <Input
              id="quote-valid-days"
              type="number"
              min={1}
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-discount">Chiết khấu (VNĐ)</Label>
            <Input
              id="quote-discount"
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-note">Ghi chú</Label>
            <Textarea
              id="quote-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Yêu cầu giao hàng, điều kiện thanh toán..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo...' : 'Tạo báo giá'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}