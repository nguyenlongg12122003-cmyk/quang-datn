import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSaveVoucher } from '@/features/admin/api'
import { getErrorMessage } from '@/lib/api/axios'
import type { Voucher, VoucherStatus, VoucherType } from '@/types'
import { getEffectiveVoucherStatus } from '@/lib/voucher'

interface VoucherFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucher: Voucher | null
}

interface FormState {
  code: string
  type: VoucherType
  value: string
  minOrderValue: string
  maxDiscount: string
  usageLimit: string
  startDate: string
  endDate: string
  description: string
  status: VoucherStatus
}

const EMPTY: FormState = {
  code: '', type: 'fixed', value: '', minOrderValue: '0', maxDiscount: '',
  usageLimit: '100', startDate: '', endDate: '', description: '', status: 'active',
}

function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildInitialState(voucher: Voucher | null): FormState {
  if (!voucher) return EMPTY
  return {
    code: voucher.code,
    type: voucher.type,
    value: String(voucher.value),
    minOrderValue: String(voucher.minOrderValue ?? 0),
    maxDiscount: voucher.maxDiscount ? String(voucher.maxDiscount) : '',
    usageLimit: String(voucher.usageLimit ?? 100),
    startDate: toLocalInput(voucher.startDate),
    endDate: toLocalInput(voucher.endDate),
    description: voucher.description ?? '',
    status: voucher.status ?? 'active',
  }
}

export function VoucherFormDialog({ open, onOpenChange, voucher }: VoucherFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{voucher ? 'Sửa voucher' : 'Tạo voucher'}</DialogTitle>
        </DialogHeader>
        <VoucherFormBody key={voucher?.id ?? 'new'} voucher={voucher} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface VoucherFormBodyProps {
  voucher: Voucher | null
  onClose: () => void
}

function VoucherFormBody({ voucher, onClose }: VoucherFormBodyProps) {
  const saveVoucher = useSaveVoucher()
  const [form, setForm] = useState<FormState>(() => buildInitialState(voucher))

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const submit = () => {
    if (!form.code || !form.value || !form.startDate || !form.endDate) {
      toast.error('Nhập mã, giá trị, ngày bắt đầu và kết thúc')
      return
    }
    const payload: Partial<Voucher> = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrderValue: Number(form.minOrderValue),
      maxDiscount: form.type === 'percentage' && form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: Number(form.usageLimit),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      description: form.description,
      ...(voucher ? { status: form.status } : {}),
    }
    saveVoucher.mutate(
      { id: voucher?.id, payload },
      {
        onSuccess: () => {
          toast.success(voucher ? 'Đã cập nhật voucher' : 'Đã tạo voucher')
          onClose()
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mã voucher" className="sm:col-span-2">
            <Input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} disabled={Boolean(voucher)} />
          </Field>
          <Field label="Loại">
            <Select
              value={form.type}
              onValueChange={(v) => {
                const type = v as VoucherType
                set(type === 'fixed' ? { type, maxDiscount: '' } : { type })
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Giảm số tiền</SelectItem>
                <SelectItem value="percentage">Giảm phần trăm</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={form.type === 'fixed' ? 'Số tiền giảm (đ)' : 'Phần trăm giảm (%)'}>
            <Input type="number" value={form.value} onChange={(e) => set({ value: e.target.value })} />
          </Field>
          <Field label="Đơn tối thiểu (đ)">
            <Input type="number" value={form.minOrderValue} onChange={(e) => set({ minOrderValue: e.target.value })} />
          </Field>
          {form.type === 'percentage' ? (
            <Field label="Giảm tối đa (đ, tùy chọn)">
              <Input type="number" value={form.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
            </Field>
          ) : null}
          {voucher ? (
            <Field label="Trạng thái">
              <Select value={form.status} onValueChange={(v) => set({ status: v as VoucherStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Tạm tắt</SelectItem>
                  <SelectItem value="expired">Đánh dấu hết hạn</SelectItem>
                </SelectContent>
              </Select>
              {getEffectiveVoucherStatus({ ...voucher, endDate: form.endDate ? new Date(form.endDate).toISOString() : voucher.endDate, status: form.status }) === 'expired' &&
              form.status !== 'expired' ? (
                <p className="text-xs text-muted-foreground">Voucher sẽ hiển thị hết hạn vì ngày kết thúc đã qua.</p>
              ) : null}
            </Field>
          ) : null}
          <Field label="Giới hạn lượt dùng">
            <Input type="number" value={form.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} />
          </Field>
          <Field label="Bắt đầu">
            <Input type="datetime-local" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          <Field label="Kết thúc">
            <Input type="datetime-local" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </Field>
          <Field label="Mô tả" className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </div>
      <DialogFooter>
        <Button onClick={submit} disabled={saveVoucher.isPending}>
          {saveVoucher.isPending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
