import type { Product } from '@/types'

export interface PosCartLine {
  productId: string
  name: string
  sku: string
  image: string
  unitPrice: number
  quantity: number
  stock: number
  isCustomizable: boolean
}

export type PosPaymentMethod = 'cash' | 'payos'

export function getPosUnitPrice(product: Product): number {
  if (product.isFlashSale && product.flashSalePrice != null) {
    if (!product.flashSaleEnd || new Date(product.flashSaleEnd) > new Date()) {
      return product.flashSalePrice
    }
  }
  return product.price
}

export function productToCartLine(product: Product): PosCartLine {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    image: product.images[0]?.url || '',
    unitPrice: getPosUnitPrice(product),
    quantity: 1,
    stock: product.stock,
    isCustomizable: Boolean(product.isCustomizable),
  }
}

export function mergeCartLine(lines: PosCartLine[], incoming: PosCartLine): PosCartLine[] {
  const existing = lines.find((line) => line.productId === incoming.productId)
  if (!existing) return [...lines, incoming]

  const nextQty = existing.quantity + 1
  if (nextQty > existing.stock) return lines

  return lines.map((line) =>
    line.productId === incoming.productId ? { ...line, quantity: nextQty } : line,
  )
}

export function updateCartQuantity(lines: PosCartLine[], productId: string, quantity: number): PosCartLine[] {
  if (quantity <= 0) return lines.filter((line) => line.productId !== productId)
  return lines.map((line) =>
    line.productId === productId ? { ...line, quantity: Math.min(quantity, line.stock) } : line,
  )
}

export function calcCartSubtotal(lines: PosCartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
}

export function calcCartTotal(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount)
}