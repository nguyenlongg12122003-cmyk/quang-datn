import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/format'
import type { WholesalePrice } from '@/types'

interface TierPriceTableProps {
  title: string
  tiers: WholesalePrice[]
  effectiveQty: number
  footer?: ReactNode
}

function activeTierMinQty(tiers: WholesalePrice[], effectiveQty: number) {
  const applicable = tiers.filter((t) => effectiveQty >= t.minQty)
  if (!applicable.length) return null
  return Math.max(...applicable.map((t) => t.minQty))
}

export function TierPriceTable({ title, tiers, effectiveQty, footer }: TierPriceTableProps) {
  if (tiers.length === 0) return null

  const activeMin = activeTierMinQty(tiers, effectiveQty)

  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <p className="font-medium">{title}</p>
      <ul className="grid gap-1 text-muted-foreground">
        {tiers.map((t) => (
          <li
            key={t.minQty}
            className={
              activeMin === t.minQty
                ? 'flex justify-between rounded-md bg-primary/10 px-2 py-1 text-primary'
                : 'flex justify-between px-2 py-1'
            }
          >
            <span>Từ {t.minQty} sản phẩm</span>
            <span className="font-medium text-foreground">{formatCurrency(t.price)}</span>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  )
}