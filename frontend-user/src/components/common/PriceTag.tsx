import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PriceTagProps {
  price: number
  originalPrice?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
}

export function PriceTag({ price, originalPrice, className, size = 'md' }: PriceTagProps) {
  const onSale = originalPrice != null && originalPrice > price
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className={cn('font-bold', onSale ? 'text-commerce' : 'text-primary', sizeMap[size])}>
        {formatCurrency(price)}
      </span>
      {onSale ? (
        <span className="text-xs text-muted-foreground line-through">
          {formatCurrency(originalPrice)}
        </span>
      ) : null}
    </div>
  )
}
