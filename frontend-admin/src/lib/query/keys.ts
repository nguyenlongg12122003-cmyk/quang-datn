import type { ProductQuery } from '@/lib/api/endpoints/catalog'
import type { AdminOrderQuery } from '@/lib/api/endpoints/orders'
import type { AdminUserQuery } from '@/lib/api/endpoints/users'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  categories: ['categories'] as const,
  brands: ['brands'] as const,
  products: {
    all: ['products'] as const,
    list: (query: ProductQuery) => ['products', 'list', query] as const,
  },
  vouchers: {
    public: ['vouchers', 'public'] as const,
  },
  orders: {
    adminList: (query: AdminOrderQuery) => ['orders', 'admin', query] as const,
  },
  users: {
    adminList: (query: AdminUserQuery) => ['users', 'admin', query] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    support: (userId?: string) => ['chat', 'support', userId ?? 'me'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    revenue: ['dashboard', 'revenue'] as const,
  },
}