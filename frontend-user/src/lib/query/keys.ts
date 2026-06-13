import type { ProductQuery } from '@/lib/api/endpoints/catalog'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  categories: ['categories'] as const,
  brands: ['brands'] as const,
  products: {
    all: ['products'] as const,
    list: (query: ProductQuery) => ['products', 'list', query] as const,
    detail: (idOrSlug: string) => ['products', 'detail', idOrSlug] as const,
    reviews: (productId: string) => ['products', 'reviews', productId] as const,
    suggestions: (q: string) => ['products', 'suggestions', q] as const,
  },
  wishlist: ['wishlist'] as const,
  vouchers: {
    public: ['vouchers', 'public'] as const,
    mine: ['vouchers', 'mine'] as const,
  },
  orders: {
    mine: ['orders', 'mine'] as const,
  },
  business: {
    me: ['business', 'me'] as const,
  },

  chat: {
    support: ['chat', 'support', 'me'] as const,
    ai: ['chat', 'ai'] as const,
  },
}