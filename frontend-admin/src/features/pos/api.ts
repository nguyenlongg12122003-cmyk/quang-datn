import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { posApi, type CreatePosOrderPayload } from '@/lib/api/endpoints/pos'

export function useCreatePosOrder() {
  return useMutation({
    mutationFn: (payload: CreatePosOrderPayload) => posApi.createOrder(payload),
  })
}

export function usePendingPosPayosOrders() {
  return useQuery({
    queryKey: ['pos', 'pending-payos'],
    queryFn: () => posApi.listPendingPayos(),
    refetchInterval: 10_000,
  })
}

export function useCancelPosPayosOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => posApi.cancelPendingPayos(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'pending-payos'] })
    },
  })
}