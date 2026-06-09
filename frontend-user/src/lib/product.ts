import type { CustomizationOption, Product } from '@/types'

/** Backend accepts options as plain strings or rich objects; normalize to objects. */
export function normalizeCustomizationOptions(
  options: Product['customizationOptions'],
): CustomizationOption[] {
  if (!options) return []
  return options.map((opt) =>
    typeof opt === 'string'
      ? { label: opt, inputType: 'text' as const, extraPrice: 0 }
      : { ...opt, inputType: opt.inputType ?? 'text', extraPrice: opt.extraPrice ?? 0 },
  )
}

/** Flash sale is active only when flagged, priced, and not past its end time. */
export function isFlashSaleActive(product: Pick<Product, 'isFlashSale' | 'flashSalePrice' | 'flashSaleEnd'>): boolean {
  if (!product.isFlashSale || product.flashSalePrice == null) return false
  if (!product.flashSaleEnd) return true
  return new Date(product.flashSaleEnd).getTime() > Date.now()
}

/** Price the customer sees (flash sale price when active, else base price). */
export function getEffectivePrice(product: Pick<Product, 'price' | 'isFlashSale' | 'flashSalePrice' | 'flashSaleEnd'>): number {
  return isFlashSaleActive(product) ? (product.flashSalePrice as number) : product.price
}

/** Best applicable unit price for a quantity, considering wholesale tiers and flash sale. */
export function getUnitPriceForQty(product: Product, qty: number): number {
  const base = getEffectivePrice(product)
  const tiers = (product.wholesalePrice ?? [])
    .filter((t) => qty >= t.minQty)
    .map((t) => t.price)
  if (tiers.length === 0) return base
  return Math.min(base, ...tiers)
}

export function getDiscountPercent(product: Pick<Product, 'price' | 'originalPrice' | 'isFlashSale' | 'flashSalePrice' | 'flashSaleEnd'>): number {
  const effective = getEffectivePrice(product)
  if (!product.originalPrice || product.originalPrice <= effective) return 0
  return Math.round(((product.originalPrice - effective) / product.originalPrice) * 100)
}
