import { useQuery } from '@tanstack/react-query'
import { voucherApi, type AdminVoucherQuery } from '@/lib/api/endpoints/vouchers'
import { queryKeys } from '@/lib/query/keys'

export function usePublicVouchers() {
  return useQuery({
    queryKey: queryKeys.vouchers.public,
    queryFn: voucherApi.list,
  })
}

export function useAdminVouchers(query: AdminVoucherQuery) {
  return useQuery({
    queryKey: queryKeys.vouchers.adminList(query),
    queryFn: () => voucherApi.adminList(query),
  })
}