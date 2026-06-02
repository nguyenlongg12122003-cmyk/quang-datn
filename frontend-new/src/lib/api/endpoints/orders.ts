import { api } from '@/lib/api/axios'
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  ReturnRequest,
  ShippingMethod,
} from '@/types'

export interface CreateOrderPayload {
  items: Array<Omit<OrderItem, 'productImage'> & { productImage?: string }>
  shippingAddress: Order['shippingAddress']
  paymentMethod: PaymentMethod
  shippingMethod: ShippingMethod
  voucherCode?: string
  note?: string
  subtotal: number
  shippingFee: number
  discount: number
  total: number
}

export interface CreateOrderResult {
  id: string
  message?: string
  paymentMethod?: PaymentMethod
  paymentStatus?: string
  paymentUrl?: string
}

export interface AdminOrderQuery {
  status?: OrderStatus | 'all'
  q?: string
}

export const orderApi = {
  // Customer
  myOrders: () => api.get<Order[]>('/orders/my-orders').then((r) => r.data),
  create: (payload: CreateOrderPayload) =>
    api.post<CreateOrderResult>('/orders', payload).then((r) => r.data),
  cancel: (id: string) =>
    api.post<{ message: string }>(`/orders/${id}/cancel`).then((r) => r.data),
  requestReturn: (id: string, reason: string) =>
    api
      .post<{ message: string; returnRequest: ReturnRequest }>(
        `/orders/${id}/return-request`,
        { reason },
      )
      .then((r) => r.data),

  // Payment verification
  verifyVnpay: (params: Record<string, string>) =>
    api.get('/orders/vnpay-verify', { params }).then((r) => r.data),
  verifyPayos: (params: Record<string, string>) =>
    api.get('/orders/payos-verify', { params }).then((r) => r.data),

  // Admin
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
