import { api } from '@/lib/api/axios'
import type { Quotation, QuotationStatus } from '@/types'

export const quotationApi = {
  list: (params?: { status?: string; q?: string }) =>
    api.get<Quotation[]>('/quotations/manage', { params }).then((r) => r.data),
  detail: (id: string) => api.get<Quotation>(`/quotations/${id}`).then((r) => r.data),
  updateStatus: (id: string, status: QuotationStatus) =>
    api.patch<{ message: string }>(`/quotations/${id}/status`, { status }).then((r) => r.data),
}