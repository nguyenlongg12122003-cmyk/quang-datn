import { api } from '@/lib/api/axios'
import type { BusinessProfile, CustomerType } from '@/types'

export interface AdminBusinessProfile extends BusinessProfile {
  email: string
  userName: string
  userPhone?: string
  customerType?: CustomerType
}

export const businessApi = {
  list: (params?: { status?: string; q?: string }) =>
    api.get<AdminBusinessProfile[]>('/business/manage', { params }).then((r) => r.data),
  review: (
    userId: string,
    payload: {
      status: BusinessProfile['status']
      customerType?: CustomerType
      creditLimit?: number
      paymentTermDays?: number
      note?: string
    },
  ) =>
    api
      .patch<{ profile: BusinessProfile; message: string }>(`/business/${userId}/review`, payload)
      .then((r) => r.data),
}