import { useQuery } from '@tanstack/react-query'
import { voucherApi } from '@/lib/api/endpoints/vouchers'
import { queryKeys } from '@/lib/query/keys'

export function usePublicVouchers() {
  return useQuery({
    queryKey: queryKeys.vouchers.public,
    queryFn: voucherApi.list,
  })
}