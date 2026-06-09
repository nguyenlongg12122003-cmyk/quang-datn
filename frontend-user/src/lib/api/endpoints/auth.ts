import { api } from '@/lib/api/axios'
import type { AuthResponse, User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  phone: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  // Backend wraps the payload as { user: {...} } — unwrap to the User itself.
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
}
