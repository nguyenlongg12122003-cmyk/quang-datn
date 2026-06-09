import { Link } from 'react-router'
import { Heart, ShoppingCart, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PriceTag } from '@/components/common/PriceTag'
import { RatingStars } from '@/components/common/RatingStars'
import { formatNumber } from '@/lib/format'
import { getDiscountPercent, getEffectivePrice, isFlashSaleActive } from '@/lib/product'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistIds,
} from '@/features/wishlist/api'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const token = useAuthStore((s) => s.token)
  const wishlistIds = useWishlistIds()
  const addWishlist = useAddToWishlist()
  const removeWishlist = useRemoveFromWishlist()

  const effectivePrice = getEffectivePrice(product)
  const discount = getDiscountPercent(product)
  const flashSale = isFlashSaleActive(product)
  const inWishlist = wishlistIds.has(product.id)
  const outOfStock = product.stock <= 0
  const image = product.images?.[0]?.url

  const handleAddToCart = () => {
    if (outOfStock) return
    if (product.isCustomizable) {
      // Customizable products must be configured on the detail page.
      window.location.assign(`/products/${product.slug}`)
      return
    }
    addItem(
      { id: product.id, slug: product.slug, name: product.name, stock: product.stock, image, unitPrice: effectivePrice },
      1,
    )
    toast.success('Đã thêm vào giỏ hàng')
  }

  const handleToggleWishlist = () => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để dùng danh sách yêu thích')
      return
    }
    if (inWishlist) {
      removeWishlist.mutate(product.id)
    } else {
      addWishlist.mutate(product.id, {
        onSuccess: () => toast.success('Đã thêm vào yêu thích'),
      })
    }
  }

  return (
    <Card className={cn('group relative overflow-hidden p-0 transition-shadow hover:shadow-md', className)}>
      <button
        type="button"
        onClick={handleToggleWishlist}
        className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-background"
        aria-label="Yêu thích"
      >
        <Heart className={cn('size-4', inWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
      </button>

      <Link to={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            <img
              src={image}
              alt={product.images?.[0]?.alt ?? product.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              Không có ảnh
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {flashSale ? (
              <Badge className="gap-1 bg-primary">
                <Sparkles className="size-3" /> Flash Sale
              </Badge>
            ) : null}
            {discount > 0 ? <Badge variant="destructive">-{discount}%</Badge> : null}
          </div>
        </div>
      </Link>

      <CardContent className="space-y-2 p-3">
        <Link to={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RatingStars rating={product.rating ?? 0} />
          <span>Đã bán {formatNumber(product.sold ?? 0)}</span>
        </div>
        <PriceTag price={effectivePrice} originalPrice={product.originalPrice} />
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={handleAddToCart}
          disabled={outOfStock}
        >
          <ShoppingCart className="size-4" />
          {outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
        </Button>
      </CardContent>
    </Card>
  )
}
