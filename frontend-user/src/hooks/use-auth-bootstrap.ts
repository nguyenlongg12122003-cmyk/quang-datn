import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api/endpoints/auth'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'

/**
 * On app init (once the persisted token is rehydrated), re-fetch /auth/me to
 * refresh the user record and addresses. Keeps the store in sync with the server.
 */
export function useAuthBootstrap(): void {
  const token = useAuthStore((s) => s.token)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const setUser = useAuthStore((s) => s.setUser)

  const { data } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    enabled: isHydrated && Boolean(token),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (data) setUser(data)
  }, [data, setUser])
}
