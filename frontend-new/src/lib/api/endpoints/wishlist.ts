import { api } from '@/lib/api/axios'
import type { Product } from '@/types'

export type WishlistItem = Product & { addedAt: string }

export const wishlistApi = {
  list: () => api.get<WishlistItem[]>('/wishlist').then((r) => r.data),
  add: (productId: string) =>
    api.post<{ message: string }>('/wishlist', { productId }).then((r) => r.data),
  remove: (productId: string) =>
    api.delete<{ message: string }>(`/wishlist/${productId}`).then((r) => r.data),
}
