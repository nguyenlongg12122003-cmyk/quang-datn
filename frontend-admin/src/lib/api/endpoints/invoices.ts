import { api } from '@/lib/api/axios'
import type { VatInvoice } from '@/types'

export const invoiceApi = {
  list: () => api.get<VatInvoice[]>('/invoices/manage').then((r) => r.data),
}