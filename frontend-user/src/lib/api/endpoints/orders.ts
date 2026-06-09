import { api } from '@/lib/api/axios'
import type {
  Order,
  OrderItem,
  PaymentMethod,
  ReturnRequest,
  ShippingMethod,
} from '@/types'

export interface CreateOrderPayload {
  items: Array<
    Omit<OrderItem, 'productImage'> & {
      productImage?: string
      packagingUnit?: string | null
      packagingQty?: number
    }
  >
  shippingAddress: Order['shippingAddress']
  paymentMethod: PaymentMethod
  shippingMethod: ShippingMethod
  voucherCode?: string
  note?: string
  quotationId?: string
  invoiceInfo?: Order['invoiceInfo']
  subtotal?: number
  shippingFee: number
  discount: number
  total?: number
}

export interface CreateOrderResult {
  id: string
  message?: string
  paymentMethod?: PaymentMethod
  paymentStatus?: string
  paymentUrl?: string
  estimatedDeliveryDate?: string
  hasCustomItems?: boolean
}

export const orderApi = {
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
  verifyVnpay: (params: Record<string, string>) =>
    api.get('/orders/vnpay-verify', { params }).then((r) => r.data),
  verifyPayos: (params: Record<string, string>) =>
    api.get('/orders/payos-verify', { params }).then((r) => r.data),
}