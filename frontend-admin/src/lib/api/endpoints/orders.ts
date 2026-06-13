import { api } from '@/lib/api/axios'
import type { CustomizationStatus, Order, OrderStatus, PaymentMethod, PaymentStatus, SalesChannel, ShippingCarrier } from '@/types'

export type OrderSort = 'newest' | 'oldest' | 'total_desc' | 'total_asc'

export type OrderTab =
  | 'all'
  | 'pending'
  | 'needs_action'
  | 'packing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

export interface AdminOrderQuery {
  tab?: OrderTab
  status?: OrderStatus | 'all'
  q?: string
  hasReturn?: 'pending'
  paymentMethod?: PaymentMethod | 'all'
  paymentStatus?: PaymentStatus | 'all'
  salesChannel?: SalesChannel | 'all'
  sort?: OrderSort
  page?: number
  limit?: number
}

export interface OrderListResponse {
  items: Order[]
  total: number
}

export interface UpdateOrderStatusPayload {
  id: string
  status: OrderStatus
  note?: string
  shippingCarrier?: ShippingCarrier
  trackingNumber?: string
}

export const orderApi = {
  list: (query: AdminOrderQuery = {}) =>
    api.get<OrderListResponse>('/orders', { params: query }).then((r) => r.data),
  getById: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  updateStatus: (payload: UpdateOrderStatusPayload) =>
    api
      .patch<{ message: string; paymentStatus?: string }>(`/orders/${payload.id}/status`, {
        status: payload.status,
        note: payload.note,
        shippingCarrier: payload.shippingCarrier,
        trackingNumber: payload.trackingNumber,
      })
      .then((r) => r.data),
  markPackingSlipPrinted: (id: string) =>
    api
      .post<{ message: string; packingSlipPrintedAt: string }>(`/orders/${id}/packing-slip-printed`)
      .then((r) => r.data),
  resolveReturn: (id: string, action: 'approved' | 'rejected', note?: string) =>
    api
      .patch<{ message: string }>(`/orders/${id}/return`, { action, note })
      .then((r) => r.data),
  updateCustomizationStatus: (
    orderId: string,
    itemId: number,
    payload: { status: CustomizationStatus; note?: string },
  ) =>
    api
      .patch<{ message: string }>(`/orders/${orderId}/items/${itemId}/customization`, payload)
      .then((r) => r.data),
  verifyPayos: (params: Record<string, string>) =>
    api
      .get<{ success: boolean; pending?: boolean; orderId?: string }>('/orders/payos-verify', { params })
      .then((r) => r.data),
}