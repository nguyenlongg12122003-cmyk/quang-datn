import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { WholesalePrice } from '@/types'

interface TierPriceTableProps {
  title: string
  tiers: WholesalePrice[]
  effectiveQty: number
  footer?: ReactNode
  onTierSelect?: (minQty: number) => void
}

function activeTierMinQty(tiers: WholesalePrice[], effectiveQty: number) {
  const applicable = tiers.filter((t) => effectiveQty >= t.minQty)
  if (!applicable.length) return null
  return Math.max(...applicable.map((t) => t.minQty))
}

function nextTierHint(tiers: WholesalePrice[], effectiveQty: number) {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty)
  const next = sorted.find((t) => t.minQty > effectiveQty)
  if (!next) return null
  return { minQty: next.minQty, price: next.price, gap: next.minQty - effectiveQty }
}

export function TierPriceTable({
  title,
  tiers,
  effectiveQty,
  footer,
  onTierSelect,
}: TierPriceTableProps) {
  if (tiers.length === 0) return null

  const activeMin = activeTierMinQty(tiers, effectiveQty)
  const hint = nextTierHint(tiers, effectiveQty)

  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <p className="font-medium">{title}</p>
      <ul className="grid gap-1 text-muted-foreground">
        {tiers.map((t) => {
          const isActive = activeMin === t.minQty
          const clickable = Boolean(onTierSelect)
          return (
            <li key={t.minQty}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onTierSelect?.(t.minQty)}
                className={cn(
                  'flex w-full justify-between rounded-md px-2 py-1 text-left transition-colors',
                  isActive && 'bg-primary/10 text-primary',
                  clickable && !isActive && 'hover:bg-muted/80',
                  !clickable && 'cursor-default',
                )}
              >
                <span>Từ {t.minQty} sản phẩm</span>
                <span className="font-medium text-foreground">{formatCurrency(t.price)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {hint ? (
        <p className="text-xs text-muted-foreground">
          Mua thêm <span className="font-medium text-foreground">{hint.gap}</span> sp để được giá{' '}
          <span className="font-medium text-primary">{formatCurrency(hint.price)}</span>
        </p>
      ) : null}
      {footer}
    </div>
  )
}