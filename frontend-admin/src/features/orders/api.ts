import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orderApi, type AdminOrderQuery, type UpdateOrderStatusPayload } from '@/lib/api/endpoints/orders'
import { queryKeys } from '@/lib/query/keys'

export function useAdminOrders(query: AdminOrderQuery) {
  return useQuery({
    queryKey: queryKeys.orders.adminList(query),
    queryFn: () => orderApi.list(query),
    refetchInterval: 30_000,
  })
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.adminDetail(id),
    queryFn: () => orderApi.getById(id),
    enabled: Boolean(id),
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateOrderStatusPayload) => orderApi.updateStatus(payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.adminDetail(variables.id) })
    },
  })
}

export function useMarkPackingSlipPrinted() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => orderApi.markPackingSlipPrinted(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.adminDetail(id) })
    },
  })
}

export function useResolveReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'approved' | 'rejected'; note?: string }) =>
      orderApi.resolveReturn(id, action, note),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.adminDetail(variables.id) })
    },
  })
}