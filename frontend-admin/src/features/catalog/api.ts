import { useQuery } from '@tanstack/react-query'
import { catalogApi, type ProductQuery, type ProductListResponse } from '@/lib/api/endpoints/catalog'
import { queryKeys } from '@/lib/query/keys'

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: catalogApi.listCategories,
    staleTime: 10 * 60 * 1000,
  })
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands,
    queryFn: catalogApi.listBrands,
    staleTime: 10 * 60 * 1000,
  })
}

export function useProducts(query: ProductQuery) {
  return useQuery<ProductListResponse>({
    queryKey: queryKeys.products.list(query),
    queryFn: () => catalogApi.listProducts(query),
  })
}