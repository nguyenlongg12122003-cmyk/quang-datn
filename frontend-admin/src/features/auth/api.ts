import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { authApi, type LoginPayload } from '@/lib/api/endpoints/auth'
import { useAuthStore } from '@/stores/auth-store'
import { reconnectSocket, disconnectSocket } from '@/lib/socket'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      reconnectSocket()
    },
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return () => {
    logout()
    disconnectSocket()
    queryClient.clear()
    navigate('/login')
  }
}