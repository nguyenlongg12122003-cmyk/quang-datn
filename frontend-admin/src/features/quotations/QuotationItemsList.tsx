import { formatCurrency } from '@/lib/format'
import type { QuotationItem } from '@/types'

interface QuotationItemsListProps {
  items: QuotationItem[]
}

export function QuotationItemsList({ items }: QuotationItemsListProps) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={item.id ?? `${item.productId}-${idx}`} className="flex gap-3 text-sm">
          {item.productImage ? (
            <img src={item.productImage} alt={item.productName} className="size-10 rounded object-cover" />
          ) : (
            <div className="size-10 rounded bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium">{item.productName}</p>
            {item.sku ? <p className="text-xs text-muted-foreground">SKU: {item.sku}</p> : null}
            <p className="text-muted-foreground">
              {formatCurrency(item.unitPrice)} × {item.quantity}
            </p>
            {item.packagingUnit ? (
              <p className="text-xs text-muted-foreground">
                Quy cách: {item.packagingQty} {item.packagingUnit}
              </p>
            ) : null}
            {item.customization ? (
              <p className="text-xs text-muted-foreground">
                {item.customization.type}
                {item.customization.text ? ` — “${item.customization.text}”` : ''}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 font-medium">
            {formatCurrency(item.unitPrice * item.quantity)}
          </span>
        </div>
      ))}
    </div>
  )
}