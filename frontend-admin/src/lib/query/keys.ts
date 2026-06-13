import type { ProductQuery } from '@/lib/api/endpoints/catalog'
import type { AdminOrderQuery } from '@/lib/api/endpoints/orders'
import type { AdminVoucherQuery } from '@/lib/api/endpoints/vouchers'
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
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  vouchers: {
    public: ['vouchers', 'public'] as const,
    adminList: (query: AdminVoucherQuery) => ['vouchers', 'admin', query] as const,
  },
  orders: {
    adminList: (query: AdminOrderQuery) => ['orders', 'admin', query] as const,
    adminDetail: (id: string) => ['orders', 'admin', 'detail', id] as const,
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
  business: {
    list: (query?: { status?: string; q?: string }) => ['business', 'admin', query] as const,
  },

  inventory: {
    movements: (query?: Record<string, unknown>) => ['inventory', 'movements', query] as const,
    lowStock: ['inventory', 'low-stock'] as const,
  },
}