import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrderItemCustomization, Product } from '@/types'

export interface CartItem {
  lineId: string
  productId: string
  slug: string
  name: string
  image?: string
  unitPrice: number
  stock: number
  quantity: number
  packagingUnit?: string | null
  packagingQty?: number
  customization?: OrderItemCustomization | null
}

interface CartState {
  items: CartItem[]
  addItem: (
    product: Pick<Product, 'id' | 'slug' | 'name' | 'stock'> & {
      image?: string
      unitPrice: number
      packagingUnit?: string | null
      packagingQty?: number
    },
    quantity: number,
    customization?: OrderItemCustomization | null,
  ) => void
  updateQuantity: (lineId: string, quantity: number) => void
  removeItem: (lineId: string) => void
  clear: () => void
}

function buildLineId(
  productId: string,
  customization?: OrderItemCustomization | null,
  packagingUnit?: string | null,
): string {
  const packKey = packagingUnit ? `::pack::${packagingUnit}` : ''
  if (!customization) return `${productId}${packKey}`

  const base = `${productId}${packKey}::${customization.type}`

  // For image customizations, never put the full (often huge) base64 into the key.
  // Use a short fingerprint so identical uploads can still merge, but key stays small.
  if (customization.inputType === 'image') {
    const data = customization.text || ''
    // Take a tiny stable slice + length as fingerprint (keeps key < ~80 chars)
    const fp = data.length > 30 ? `${data.slice(0, 22)}L${data.length}` : data
    const safeFp = fp.replace(/[^a-zA-Z0-9]/g, '')
    return `${base}::img::${safeFp}`
  }

  // Text customizations are short — safe to include a bounded prefix
  const text = (customization.text || '').slice(0, 64).replace(/::/g, ':')
  return `${base}::${text}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product, quantity, customization) =>
        set((state) => {
          const lineId = buildLineId(product.id, customization, product.packagingUnit)
          const existing = state.items.find((i) => i.lineId === lineId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.lineId === lineId
                  ? { ...i, quantity: Math.min(i.quantity + quantity, i.stock) }
                  : i,
              ),
            }
          }
          const item: CartItem = {
            lineId,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.image,
            unitPrice: product.unitPrice,
            stock: product.stock,
            quantity: Math.min(quantity, product.stock),
            packagingUnit: product.packagingUnit ?? null,
            packagingQty: product.packagingQty ?? 1,
            customization: customization ?? null,
          }
          return { items: [...state.items, item] }
        }),
      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.lineId === lineId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i,
          ),
        })),
      removeItem: (lineId) =>
        set((state) => ({ items: state.items.filter((i) => i.lineId !== lineId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'quangvpp-cart' },
  ),
)

export function cartItemTotal(item: CartItem): number {
  const extra = item.customization?.extraPrice ?? 0
  return (item.unitPrice + extra) * item.quantity
}

export const selectCartCount = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0)

export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + cartItemTotal(i), 0)
