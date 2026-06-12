import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { quotationApi } from '@/lib/api/endpoints/quotations'
import { queryKeys } from '@/lib/query/keys'
import type { QuotationStatus } from '@/types'

export function useAdminQuotations(query?: { status?: string; q?: string }) {
  return useQuery({
    queryKey: queryKeys.quotations.list(query),
    queryFn: () => quotationApi.list(query),
  })
}

export function useUpdateQuotationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuotationStatus }) =>
      quotationApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

export function useCancelQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quotationApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

export function useUpdateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & { discount?: number; validUntil?: string; note?: string | null }) =>
      quotationApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}