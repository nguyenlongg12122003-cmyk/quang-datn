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
  customization?: OrderItemCustomization | null
}

interface CartState {
  items: CartItem[]
  addItem: (
    product: Pick<Product, 'id' | 'slug' | 'name' | 'stock'> & {
      image?: string
      unitPrice: number
    },
    quantity: number,
    customization?: OrderItemCustomization | null,
  ) => void
  updateQuantity: (lineId: string, quantity: number) => void
  removeItem: (lineId: string) => void
  clear: () => void
}

function buildLineId(productId: string, customization?: OrderItemCustomization | null): string {
  if (!customization) return productId
  return `${productId}::${customization.type}::${customization.text}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product, quantity, customization) =>
        set((state) => {
          const lineId = buildLineId(product.id, customization)
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
