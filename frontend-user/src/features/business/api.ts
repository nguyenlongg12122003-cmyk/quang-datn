import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/lib/api/endpoints/business'
import { authApi } from '@/lib/api/endpoints/auth'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'

async function fetchBusinessProfile() {
  const data = await businessApi.me()
  if (data.profile?.status === 'approved') {
    const user = await authApi.me()
    useAuthStore.getState().setUser(user)
  }
  return data
}

export function useBusinessProfile() {
  return useQuery({
    queryKey: queryKeys.business.me,
    queryFn: fetchBusinessProfile,
  })
}

export function useRegisterBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: businessApi.register,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.business.me }),
  })
}

export function useResubmitBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: businessApi.resubmit,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.business.me }),
  })
}