import { api } from '@/lib/api/axios'
import type { User, UserRole, UserStatus } from '@/types'

export interface AdminUserQuery {
  q?: string
  role?: UserRole
  status?: UserStatus
}

export const userApi = {
  list: (query: AdminUserQuery = {}) =>
    api.get<User[]>('/users', { params: query }).then((r) => r.data),
  setStatus: (id: string, status: UserStatus) =>
    api.patch<{ message: string }>(`/users/${id}/status`, { status }).then((r) => r.data),
  setRole: (id: string, role: UserRole) =>
    api.patch<{ message: string }>(`/users/${id}/role`, { role }).then((r) => r.data),
}