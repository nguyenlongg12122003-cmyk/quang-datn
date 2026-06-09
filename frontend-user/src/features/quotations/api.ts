import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { quotationApi } from '@/lib/api/endpoints/quotations'
import { queryKeys } from '@/lib/query/keys'

export function useMyQuotations() {
  return useQuery({
    queryKey: queryKeys.quotations.mine,
    queryFn: quotationApi.mine,
  })
}

export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quotationApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.quotations.mine }),
  })
}

export function useConvertQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: Parameters<typeof quotationApi.convert>[1] & { id: string }) =>
      quotationApi.convert(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.mine })
      qc.invalidateQueries({ queryKey: queryKeys.orders.mine })
    },
  })
}