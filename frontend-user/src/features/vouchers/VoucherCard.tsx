import { Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { describeVoucherValue } from '@/lib/voucher'
import { cn } from '@/lib/utils'
import type { Voucher } from '@/types'

interface VoucherCardProps {
  voucher: Voucher
  onClaim?: (voucher: Voucher) => void
  claiming?: boolean
  claimed?: boolean
  used?: boolean
}

export function VoucherCard({ voucher, onClaim, claiming, claimed, used }: VoucherCardProps) {
  return (
    <div className={cn('flex overflow-hidden rounded-xl border border-border bg-card', used && 'opacity-60')}>
      <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 bg-commerce p-3 text-commerce-foreground">
        <Ticket className="size-6" />
        <span className="text-center text-xs font-medium">Voucher</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <span className="font-bold">{voucher.code}</span>
          {used ? <Badge variant="secondary">Đã dùng</Badge> : null}
        </div>
        <p className="text-sm font-medium text-commerce">{describeVoucherValue(voucher)}</p>
        <p className="text-xs text-muted-foreground">
          Đơn tối thiểu {formatCurrency(voucher.minOrderValue)}
        </p>
        {voucher.endDate ? (
          <p className="text-xs text-muted-foreground">HSD: {formatDate(voucher.endDate)}</p>
        ) : null}
        {onClaim ? (
          <Button
            size="sm"
            className="mt-2 w-fit"
            disabled={claiming || claimed}
            onClick={() => onClaim(voucher)}
          >
            {claimed ? 'Đã lưu' : claiming ? 'Đang lưu…' : 'Lưu mã'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
