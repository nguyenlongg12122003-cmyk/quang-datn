import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/lib/api/endpoints/business'
import { queryKeys } from '@/lib/query/keys'

export function useAdminBusinessProfiles(query?: { status?: string; q?: string }) {
  return useQuery({
    queryKey: queryKeys.business.list(query),
    queryFn: () => businessApi.list(query),
  })
}

export function useReviewBusinessProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ...payload }: Parameters<typeof businessApi.review>[1] & { userId: string }) =>
      businessApi.review(userId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business', 'admin'] }),
  })
}