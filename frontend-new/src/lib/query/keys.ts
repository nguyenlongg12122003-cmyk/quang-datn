import type { ProductQuery } from '@/lib/api/endpoints/catalog'
import type { AdminOrderQuery } from '@/lib/api/endpoints/orders'
import type { AdminUserQuery } from '@/lib/api/endpoints/users'

// Centralized query-key factory. Keeps invalidation consistent across features.
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
    adminList: (query: AdminOrderQuery) => ['orders', 'admin', query] as const,
  },
  users: {
    adminList: (query: AdminUserQuery) => ['users', 'admin', query] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    support: (userId?: string) => ['chat', 'support', userId ?? 'me'] as const,
    ai: ['chat', 'ai'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    revenue: ['dashboard', 'revenue'] as const,
    customers: ['dashboard', 'customers'] as const,
  },
}
