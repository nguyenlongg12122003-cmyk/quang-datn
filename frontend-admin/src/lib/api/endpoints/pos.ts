import { api } from '@/lib/api/axios'
import type { PaymentStatus } from '@/types'
import type { PosPaymentMethod } from '@/features/pos/pos-helpers'

export interface PosOrderItemPayload {
  productId: string
  quantity: number
}

export interface CreatePosOrderPayload {
  items: PosOrderItemPayload[]
  paymentMethod: PosPaymentMethod
  discount?: number
  note?: string
  customerName?: string
  customerPhone?: string
}

export interface PosOrderLineResult {
  productId: string
  productName: string
  productImage: string
  price: number
  quantity: number
}

export interface CreatePosOrderResult {
  id: string
  subtotal: number
  discount?: number
  total: number
  paymentMethod: PosPaymentMethod
  paymentStatus: PaymentStatus
  status: string
  salesChannel: 'pos'
  createdAt?: string
  customerName?: string
  items: PosOrderLineResult[]
  paymentUrl?: string
  qrCode?: string | null
}

export interface PendingPosOrder {
  id: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: 'payos'
  paymentStatus: PaymentStatus
  status: string
  salesChannel: 'pos'
  createdAt: string
  note?: string | null
  customerName: string
  customerPhone?: string
  items: Array<{
    productId: string
    productName: string
    price: number
    quantity: number
  }>
}

export const posApi = {
  createOrder: (payload: CreatePosOrderPayload) =>
    api.post<CreatePosOrderResult>('/orders/pos', payload).then((r) => r.data),
  listPendingPayos: () =>
    api.get<{ items: PendingPosOrder[] }>('/orders/pos/pending').then((r) => r.data.items),
  cancelPendingPayos: (id: string, reason?: string) =>
    api.post<{ id: string; message: string }>(`/orders/pos/${id}/cancel`, { reason }).then((r) => r.data),
}