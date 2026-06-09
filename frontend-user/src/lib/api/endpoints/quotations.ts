import { api } from '@/lib/api/axios'
import type { Address, PaymentMethod, Quotation, ShippingMethod } from '@/types'

export interface CreateQuotationPayload {
  items: Array<{
    productId: string
    quantity?: number
    packagingUnit?: string
    packagingQty?: number
    customization?: { type: string; text: string; inputType?: string }
  }>
  note?: string
  validDays?: number
  discount?: number
}

export const quotationApi = {
  mine: () => api.get<Quotation[]>('/quotations/my').then((r) => r.data),
  detail: (id: string) => api.get<Quotation>(`/quotations/${id}`).then((r) => r.data),
  create: (payload: CreateQuotationPayload) =>
    api.post<Quotation>('/quotations', payload).then((r) => r.data),
  convert: (
    id: string,
    payload: {
      shippingAddress: Address
      paymentMethod?: PaymentMethod
      shippingMethod?: ShippingMethod
      note?: string
    },
  ) =>
    api
      .post<{ message: string; orderId: string; estimatedDeliveryDate?: string }>(
        `/quotations/${id}/convert`,
        payload,
      )
      .then((r) => r.data),
}