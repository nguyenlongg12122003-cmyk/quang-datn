import { api } from '@/lib/api/axios'
import type { Quotation, QuotationStatus } from '@/types'

/**
 * MIRROR API CLIENT (endpoints)
 * frontend-user/src/lib/api/endpoints/quotations.ts is very similar.
 * Keep method signatures in sync.
 */

export const quotationApi = {
  list: (params?: { status?: string; q?: string }) =>
    api.get<Quotation[]>('/quotations/manage', { params }).then((r) => r.data),
  detail: (id: string) => api.get<Quotation>(`/quotations/${id}`).then((r) => r.data),
  updateStatus: (id: string, status: QuotationStatus) =>
    api.patch<{ message: string }>(`/quotations/${id}/status`, { status }).then((r) => r.data),
  update: (id: string, patch: { discount?: number; validUntil?: string; note?: string | null }) =>
    api.patch<Quotation>(`/quotations/${id}`, patch).then((r) => r.data),
  cancel: (id: string) =>
    api.post<{ message: string; quotation?: Quotation }>(`/quotations/${id}/cancel`).then((r) => r.data),
}