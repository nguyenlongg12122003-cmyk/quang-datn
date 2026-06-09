import { api } from '@/lib/api/axios'
import type { Address } from '@/types'

export interface UpdateProfilePayload {
  name?: string
  phone?: string
  avatar?: string
}

export interface AddAddressPayload {
  name: string
  phone: string
  street: string
  ward: string
  district: string
  city: string
  isDefault?: boolean
}

export const userApi = {
  updateProfile: (payload: UpdateProfilePayload) =>
    api.put<{ message: string }>('/users/me', payload).then((r) => r.data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api
      .post<{ message: string }>('/users/change-password', { oldPassword, newPassword })
      .then((r) => r.data),
  addAddress: (payload: AddAddressPayload) =>
    api
      .post<{ id: string; message: string }>('/users/addresses', payload)
      .then((r) => r.data),
  deleteAddress: (id: string) =>
    api.delete<{ message: string }>(`/users/addresses/${id}`).then((r) => r.data),
  setDefaultAddress: (id: string) =>
    api
      .patch<{ message: string }>(`/users/addresses/${id}/default`)
      .then((r) => r.data),
}

export type { Address }