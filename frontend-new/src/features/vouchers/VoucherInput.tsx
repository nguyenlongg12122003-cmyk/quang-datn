import { useState } from 'react'
import { Check, ChevronDown, Ticket, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMyVouchers } from '@/features/vouchers/api'
import { voucherApi } from '@/lib/api/endpoints/vouchers'
import { getErrorMessage } from '@/lib/api/axios'
import { formatCurrency, formatDate } from '@/lib/format'
import { describeVoucherValue, getSavedVoucherEligibility } from '@/lib/voucher'
import { cn } from '@/lib/utils'
import type { UserVoucher, Voucher } from '@/types'

export interface AppliedVoucher {
  voucher: Voucher
  discount: number
}

interface VoucherInputProps {
  subtotal: number
  applied: AppliedVoucher | null
  onApply: (value: AppliedVoucher | null) => void
}

export function VoucherInput({ subtotal, applied, onApply }: VoucherInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data: savedVouchers = [] } = useMyVouchers()

  // Single validation path for both manual entry and the saved-voucher picker,
  // so server rules (validity window, usage, rate-limit) stay authoritative.
  const applyCode = async (rawCode: string) => {
    const trimmed = rawCode.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    try {
      const result = await voucherApi.validate(trimmed, subtotal)
      if (result.valid && result.voucher) {
        onApply({ voucher: result.voucher, discount: result.discount ?? 0 })
        toast.success(`Áp dụng mã ${result.voucher.code} thành công`)
        setCode('')
        setPickerOpen(false)
      } else {
        toast.error(result.message ?? 'Mã không hợp lệ')
      }
    } catch (error) {
      // 429 rate-limit and other validation errors surface their message here.
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-sm">
          <Check className="size-4 text-primary" />
          <span className="font-medium">{applied.voucher.code}</span>
          <span className="text-muted-foreground">−{formatCurrency(applied.discount)}</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => onApply(null)} aria-label="Bỏ mã">
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Nhập mã giảm giá"
            className="pl-9"
            onKeyDown={(e) => e.key === 'Enter' && applyCode(code)}
          />
        </div>
        <Button variant="outline" onClick={() => applyCode(code)} disabled={loading || !code.trim()}>
          {loading ? 'Đang kiểm tra…' : 'Áp dụng'}
        </Button>
      </div>

      {savedVouchers.length > 0 ? (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto w-full justify-between px-1 text-primary">
              <span className="flex items-center gap-1.5">
                <Ticket className="size-4" />
                Chọn voucher đã lưu ({savedVouchers.length})
              </span>
              <ChevronDown className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <SavedVoucherList
              vouchers={savedVouchers}
              subtotal={subtotal}
              loading={loading}
              onPick={(uv) => applyCode(uv.voucher.code)}
            />
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}

interface SavedVoucherListProps {
  vouchers: UserVoucher[]
  subtotal: number
  loading: boolean
  onPick: (userVoucher: UserVoucher) => void
}

function SavedVoucherList({ vouchers, subtotal, loading, onPick }: SavedVoucherListProps) {
  return (
    <div className="max-h-72 overflow-y-auto">
      <ul className="divide-y divide-border">
        {vouchers.map((uv) => {
          const { usable, reason } = getSavedVoucherEligibility(uv, subtotal)
          return (
            <li key={uv.id}>
              <button
                type="button"
                disabled={!usable || loading}
                onClick={() => onPick(uv)}
                className={cn(
                  'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors',
                  usable ? 'hover:bg-accent' : 'cursor-not-allowed opacity-55',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{uv.voucher.code}</span>
                  <span className="text-sm font-medium text-primary">
                    {describeVoucherValue(uv.voucher)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Đơn tối thiểu {formatCurrency(uv.voucher.minOrderValue)}
                  {uv.expiresAt ? ` · HSD ${formatDate(uv.expiresAt)}` : ''}
                </span>
                {!usable && reason ? (
                  <span className="text-xs font-medium text-destructive">{reason}</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
