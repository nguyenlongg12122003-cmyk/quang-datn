import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useProduct(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(idOrSlug ?? ''),
    queryFn: () => catalogApi.getProduct(idOrSlug as string),
    enabled: Boolean(idOrSlug),
  })
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.reviews(productId ?? ''),
    queryFn: () => catalogApi.listReviews(productId as string),
    enabled: Boolean(productId),
  })
}

export function useSearchSuggestions(q: string) {
  return useQuery({
    queryKey: queryKeys.products.suggestions(q),
    queryFn: () => catalogApi.searchSuggestions(q),
    enabled: q.trim().length >= 2,
  })
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { rating: number; comment: string }) =>
      catalogApi.createReview(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.reviews(productId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) })
    },
  })
}
