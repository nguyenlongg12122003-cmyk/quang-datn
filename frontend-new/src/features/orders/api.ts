import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  orderApi,
  type AdminOrderQuery,
  type CreateOrderPayload,
} from '@/lib/api/endpoints/orders'
import { queryKeys } from '@/lib/query/keys'
import type { OrderStatus } from '@/types'

// ── Customer ─────────────────────────────────────────────────────────────────
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

export function useRequestReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      orderApi.requestReturn(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine })
    },
  })
}

// ── Admin ────────────────────────────────────────────────────────────────────
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
