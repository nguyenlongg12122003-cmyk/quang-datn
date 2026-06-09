import { api } from '@/lib/api/axios'
import type { InvoiceInfo, Order, VatInvoice } from '@/types'

export const invoiceApi = {
  getByOrder: (orderId: string) =>
    api
      .get<{ order: Order; invoice: VatInvoice | null }>(`/invoices/order/${orderId}`)
      .then((r) => r.data),
  createForOrder: (
    orderId: string,
    payload?: Partial<InvoiceInfo> & { requestInvoice?: boolean; vatRate?: number },
  ) =>
    api
      .post<{ invoice: VatInvoice; order: Order; message: string }>(
        `/invoices/order/${orderId}`,
        payload ?? {},
      )
      .then((r) => r.data),
}