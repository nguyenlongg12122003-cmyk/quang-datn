import type { CustomizationOption, CustomerType, Product } from '@/types'

/**
 * CLIENT PRICING HELPERS — MUST STAY IN SYNC WITH BACKEND
 *
 * See canonical model and full precedence in:
 *   backend/src/services/priceService.js  (CANONICAL comment at top)
 *
 * These functions are for display / cart snapshot only.
 * Báo giá creation and admin quote edit are always server-authoritative.
 */

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

function getTierPrices(product: Product, customerType: CustomerType = 'retail') {
  const groupPrices = product.groupPrices ?? {}
  if (customerType === 'enterprise' && groupPrices.enterprise?.length) {
    return groupPrices.enterprise
  }
  if (customerType === 'wholesale' && groupPrices.wholesale?.length) {
    return groupPrices.wholesale
  }
  return product.wholesalePrice ?? []
}

/** Best applicable unit price for a quantity, considering wholesale tiers and flash sale. */
export function getUnitPriceForQty(
  product: Product,
  qty: number,
  customerType: CustomerType = 'retail',
): number {
  const base = getEffectivePrice(product)
  const tiers = getTierPrices(product, customerType)
    .filter((t) => qty >= t.minQty)
    .map((t) => t.price)
  if (tiers.length === 0) return base
  return Math.min(base, ...tiers)
}

export function getPackagingUnitPrice(
  product: Product,
  unitLabel: string,
  packQty: number,
  customerType: CustomerType = 'retail',
) {
  if (!unitLabel) return null
  const normalized = String(unitLabel).trim().replace(/\s+/g, ' ')
  // Use robust match (same spirit as backend) to avoid price display bugs when labels have minor whitespace differences
  const unit = (product.packagingUnits ?? []).find(
    (u) => (u.label || '').trim().replace(/\s+/g, ' ') === normalized
  )
  if (!unit) return null
  const totalQty = unit.qtyPerUnit * packQty
  if (unit.price != null) return unit.price / unit.qtyPerUnit
  return getUnitPriceForQty(product, totalQty, customerType)
}

export function getDiscountPercent(product: Pick<Product, 'price' | 'originalPrice' | 'isFlashSale' | 'flashSalePrice' | 'flashSaleEnd'>): number {
  const effective = getEffectivePrice(product)
  if (!product.originalPrice || product.originalPrice <= effective) return 0
  return Math.round(((product.originalPrice - effective) / product.originalPrice) * 100)
}
