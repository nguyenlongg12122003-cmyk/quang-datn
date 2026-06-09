import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orderApi, type AdminOrderQuery } from '@/lib/api/endpoints/orders'
import { queryKeys } from '@/lib/query/keys'
import type { OrderStatus } from '@/types'

export function useAdminOrders(query: AdminOrderQuery) {
  return useQuery({
    queryKey: queryKeys.orders.adminList(query),
    queryFn: () => orderApi.list(query),
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
      orderApi.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] })
    },
  })
}

export function useResolveReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'approved' | 'rejected'; note?: string }) =>
      orderApi.resolveReturn(id, action, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] })
    },
  })
}