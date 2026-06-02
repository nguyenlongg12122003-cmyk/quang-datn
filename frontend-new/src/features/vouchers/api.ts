import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { myVoucherApi, voucherApi } from '@/lib/api/endpoints/vouchers'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'

export function usePublicVouchers() {
  return useQuery({
    queryKey: queryKeys.vouchers.public,
    queryFn: voucherApi.list,
  })
}

export function useMyVouchers() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: queryKeys.vouchers.mine,
    queryFn: myVoucherApi.list,
    enabled: Boolean(token),
  })
}

export function useClaimVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (voucherId: string) => myVoucherApi.claim(voucherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.mine })
    },
  })
}
