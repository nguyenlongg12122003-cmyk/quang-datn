import { api } from '@/lib/api/axios'
import type { Address, User, UserRole, UserStatus } from '@/types'

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

export interface AdminUserQuery {
  q?: string
  role?: UserRole
}

export const userApi = {
  // Profile
  updateProfile: (payload: UpdateProfilePayload) =>
    api.put<{ message: string }>('/users/me', payload).then((r) => r.data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api
      .post<{ message: string }>('/users/change-password', { oldPassword, newPassword })
      .then((r) => r.data),

  // Addresses (no GET, no update — only add/delete/default)
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

  // Admin
  list: (query: AdminUserQuery = {}) =>
    api.get<User[]>('/users', { params: query }).then((r) => r.data),
  setStatus: (id: string, status: UserStatus) =>
    api.patch<{ message: string }>(`/users/${id}/status`, { status }).then((r) => r.data),
  setRole: (id: string, role: UserRole) =>
    api.patch<{ message: string }>(`/users/${id}/role`, { role }).then((r) => r.data),
}

export type { Address }
