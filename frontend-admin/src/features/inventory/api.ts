import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api/endpoints/inventory'
import { queryKeys } from '@/lib/query/keys'

export function useInventoryMovements(query?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.inventory.movements(query),
    queryFn: () => inventoryApi.movements(query),
  })
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: queryKeys.inventory.lowStock,
    queryFn: inventoryApi.lowStock,
  })
}

export function useInventoryAdjust() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.movements() })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.lowStock })
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats })
    },
  })
}