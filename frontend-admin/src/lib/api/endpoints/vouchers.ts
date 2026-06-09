import { api } from '@/lib/api/axios'
import type { Voucher } from '@/types'

export const voucherApi = {
  list: () => api.get<Voucher[]>('/vouchers').then((r) => r.data),
  create: (payload: Partial<Voucher>) =>
    api.post<{ id: string; message: string }>('/vouchers', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Voucher>) =>
    api.put<{ message: string }>(`/vouchers/${id}`, payload).then((r) => r.data),
  remove: (id: string) =>
    api.delete<{ message: string }>(`/vouchers/${id}`).then((r) => r.data),
}