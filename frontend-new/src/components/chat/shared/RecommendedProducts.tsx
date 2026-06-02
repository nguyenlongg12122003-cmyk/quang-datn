import { Link } from 'react-router'
import { formatCurrency } from '@/lib/format'
import type { RecommendedProduct } from '@/types'

interface RecommendedProductsProps {
  products: RecommendedProduct[]
}

export function RecommendedProducts({ products }: RecommendedProductsProps) {
  if (!products.length) return null
  return (
    <div className="mt-1 flex max-w-[85%] flex-col gap-2">
      {products.map((p) => (
        <Link
          key={p.id}
          to={`/products/${p.slug}`}
          className="flex gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary"
        >
          {p.image ? (
            <img src={p.image} alt={p.name} className="size-14 shrink-0 rounded-md object-cover" />
          ) : null}
          <div className="min-w-0 space-y-0.5">
            <p className="line-clamp-2 text-xs font-medium">{p.name}</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(p.price)}</p>
            {p.reason ? (
              <p className="line-clamp-1 text-[11px] text-muted-foreground">{p.reason}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  )
}
