import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAccessToken } from '@/lib/auth-token'
import type { User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isHydrated: boolean
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isHydrated: false,
      setAuth: (token, user) => {
        setAccessToken(token)
        set({ token, user })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        setAccessToken(null)
        set({ token: null, user: null })
      },
    }),
    {
      name: 'quangvpp-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        // Replay the persisted token into the HTTP layer on app load.
        if (state?.token) setAccessToken(state.token)
        useAuthStore.setState({ isHydrated: true })
      },
    },
  ),
)

export const selectIsAuthenticated = (s: AuthState) => Boolean(s.token && s.user)
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'admin'
