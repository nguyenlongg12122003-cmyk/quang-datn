import { api } from '@/lib/api/axios'
import type { UserVoucher, Voucher } from '@/types'

export interface ValidateVoucherResult {
  valid: boolean
  voucher?: Voucher
  discount?: number
  message?: string
}

export const voucherApi = {
  list: () => api.get<Voucher[]>('/vouchers').then((r) => r.data),
  validate: (code: string, subtotal: number) =>
    api
      .post<ValidateVoucherResult>('/vouchers/validate', { code, subtotal })
      .then((r) => r.data),
}

export const myVoucherApi = {
  list: () => api.get<UserVoucher[]>('/my-vouchers').then((r) => r.data),
  claim: (voucherId: string) =>
    api
      .post<{ id: string; message: string }>(`/my-vouchers/${voucherId}/claim`)
      .then((r) => r.data),
}