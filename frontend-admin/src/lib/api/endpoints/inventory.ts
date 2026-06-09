import { api } from '@/lib/api/axios'
import type { Product } from '@/types'

export type StockMovementType = 'in' | 'out' | 'adjustment' | 'sale' | 'return'

export interface StockMovement {
  id: string
  productId: string
  productName: string
  sku: string
  type: StockMovementType
  quantity: number
  stockBefore: number
  stockAfter: number
  reason?: string | null
  referenceType?: string | null
  referenceId?: string | null
  createdBy: string
  createdAt: string
}

export const inventoryApi = {
  movements: (params?: { productId?: string; type?: string; page?: number; limit?: number }) =>
    api
      .get<{ items: StockMovement[]; total: number }>('/inventory/movements', { params })
      .then((r) => r.data),
  lowStock: () => api.get<Product[]>('/inventory/low-stock').then((r) => r.data),
  byBarcode: (code: string) => api.get<Product>(`/inventory/by-barcode/${code}`).then((r) => r.data),
  adjust: (payload: {
    productId: string
    type: 'in' | 'out' | 'adjustment'
    quantity?: number
    targetStock?: number
    reason?: string
  }) =>
    api.post<{ message: string; stockBefore: number; stockAfter: number }>('/inventory/adjust', payload).then((r) => r.data),
}