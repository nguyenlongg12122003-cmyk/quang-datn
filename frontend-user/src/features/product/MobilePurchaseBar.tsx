import { Heart, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MobilePurchaseBarProps {
  lineTotal: number
  onSale: boolean
  outOfStock: boolean
  inWishlist: boolean
  onAddToCart: () => void
  onBuyNow: () => void
  onToggleWishlist: () => void
}

export function MobilePurchaseBar({
  lineTotal,
  onSale,
  outOfStock,
  inWishlist,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: MobilePurchaseBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] text-muted-foreground">Tạm tính</p>
          <p
            className={cn(
              'text-base font-bold',
              onSale ? 'text-commerce' : 'text-primary',
            )}
          >
            {formatCurrency(lineTotal)}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onToggleWishlist}
          aria-label="Yêu thích"
        >
          <Heart className={inWishlist ? 'fill-destructive text-destructive' : ''} />
        </Button>
        <Button
          className="min-w-0 flex-1 gap-1.5"
          size="lg"
          onClick={onAddToCart}
          disabled={outOfStock}
        >
          <ShoppingCart className="size-4 shrink-0" />
          <span className="truncate">{outOfStock ? 'Hết hàng' : 'Thêm giỏ'}</span>
        </Button>
        <Button
          variant="secondary"
          className="shrink-0"
          size="lg"
          onClick={onBuyNow}
          disabled={outOfStock}
        >
          Mua ngay
        </Button>
      </div>
    </div>
  )
}