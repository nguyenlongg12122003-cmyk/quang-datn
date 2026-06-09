import { api } from '@/lib/api/axios'
import type { BusinessProfile } from '@/types'

export interface BusinessMeResponse {
  profile: BusinessProfile | null
  outstandingCredit?: number
  availableCredit?: number
}

export interface RegisterBusinessPayload {
  companyName: string
  taxCode?: string
  businessType: BusinessProfile['businessType']
  contactPerson: string
  contactPhone?: string
  contactEmail?: string
  invoiceAddress?: string
}

export const businessApi = {
  me: () => api.get<BusinessMeResponse>('/business/me').then((r) => r.data),
  register: (payload: RegisterBusinessPayload) =>
    api.post<{ profile: BusinessProfile; message: string }>('/business/register', payload).then((r) => r.data),
  resubmit: (payload: RegisterBusinessPayload) =>
    api.patch<{ profile: BusinessProfile; message: string }>('/business/me', payload).then((r) => r.data),
}