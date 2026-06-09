import type { Product } from '@/types'

export function isFlashSaleActive(
  product: Pick<Product, 'isFlashSale' | 'flashSalePrice' | 'flashSaleEnd'>,
): boolean {
  if (!product.isFlashSale || product.flashSalePrice == null) return false
  if (!product.flashSaleEnd) return true
  return new Date(product.flashSaleEnd).getTime() > Date.now()
}

export function getStockStatus(stock: number): 'out' | 'low' | 'ok' {
  if (stock <= 0) return 'out'
  if (stock < 100) return 'low'
  return 'ok'
}

export const STOCK_STATUS_LABELS = {
  out: 'Hết hàng',
  low: 'Tồn thấp',
  ok: 'Còn hàng',
} as const

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function specificationsToRows(
  specs: Record<string, string> | undefined,
): Array<{ key: string; value: string }> {
  if (!specs) return []
  return Object.entries(specs).map(([key, value]) => ({ key, value }))
}

export function rowsToSpecifications(
  rows: Array<{ key: string; value: string }>,
): Record<string, string> {
  return Object.fromEntries(
    rows
      .map((row) => [row.key.trim(), row.value.trim()] as const)
      .filter(([key, value]) => key && value),
  )
}