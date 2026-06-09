import { api } from '@/lib/api/axios'
import type { AuthResponse, User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
}