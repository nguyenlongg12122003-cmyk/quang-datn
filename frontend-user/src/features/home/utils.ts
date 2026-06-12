import type { Product } from '@/types'
import { isFlashSaleActive } from '@/lib/product'

/** Earliest active flash-sale end among products; falls back to end of today. */
export function getFlashSaleEndDate(products: Product[]): Date {
  const activeEnds = products
    .filter(isFlashSaleActive)
    .map((p) => p.flashSaleEnd)
    .filter((end): end is string => Boolean(end))
    .map((end) => new Date(end).getTime())

  if (activeEnds.length > 0) {
    return new Date(Math.min(...activeEnds))
  }

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  return endOfDay
}