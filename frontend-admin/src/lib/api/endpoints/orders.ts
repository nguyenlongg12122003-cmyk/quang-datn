import { api } from '@/lib/api/axios'
import type { Order, OrderStatus } from '@/types'

export interface AdminOrderQuery {
  status?: OrderStatus | 'all'
  q?: string
}

export const orderApi = {
  list: (query: AdminOrderQuery = {}) =>
    api.get<Order[]>('/orders', { params: query }).then((r) => r.data),
  updateStatus: (id: string, status: OrderStatus, note?: string) =>
    api
      .patch<{ message: string; paymentStatus?: string }>(`/orders/${id}/status`, {
        status,
        note,
      })
      .then((r) => r.data),
  resolveReturn: (id: string, action: 'approved' | 'rejected', note?: string) =>
    api
      .patch<{ message: string }>(`/orders/${id}/return`, { action, note })
      .then((r) => r.data),
}