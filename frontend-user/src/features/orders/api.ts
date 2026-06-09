import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orderApi, type CreateOrderPayload } from '@/lib/api/endpoints/orders'
import { queryKeys } from '@/lib/query/keys'

export function useMyOrders() {
  return useQuery({ queryKey: queryKeys.orders.mine, queryFn: orderApi.myOrders })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => orderApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => orderApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine })
    },
  })
}