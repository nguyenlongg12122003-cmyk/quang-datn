import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { wishlistApi } from '@/lib/api/endpoints/wishlist'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/auth-store'

export function useWishlist() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: queryKeys.wishlist,
    queryFn: wishlistApi.list,
    enabled: Boolean(token),
  })
}

/** Set of product ids currently in the wishlist, for quick membership checks. */
export function useWishlistIds(): Set<string> {
  const { data } = useWishlist()
  return new Set((data ?? []).map((item) => item.id))
}

export function useAddToWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.add(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist })
    },
  })
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.remove(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist })
    },
  })
}
