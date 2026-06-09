import { api } from '@/lib/api/axios'
import type { Brand, Category, Product, ProductReview } from '@/types'

export interface ProductQuery {
  categoryId?: string
  categorySlug?: string
  brandId?: string
  q?: string
  sortBy?: 'popular' | 'price-asc' | 'price-desc' | 'newest' | 'rating'
  isFlashSale?: boolean
  isCustomizable?: boolean
  hasWholesale?: boolean
  status?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

export interface ProductListResponse {
  items: Product[]
  total: number
}

export const catalogApi = {
  listCategories: () =>
    api.get<Category[]>('/catalog/categories').then((r) => r.data),
  listBrands: () => api.get<Brand[]>('/catalog/brands').then((r) => r.data),
  listProducts: (query: ProductQuery = {}) =>
    api
      .get<ProductListResponse>('/catalog/products', { params: query })
      .then((r) => r.data),
  getProduct: (idOrSlug: string) =>
    api.get<Product>(`/catalog/products/${idOrSlug}`).then((r) => r.data),
  searchSuggestions: (q: string) =>
    api
      .get<string[]>('/catalog/search-suggestions', { params: { q } })
      .then((r) => r.data),
  listReviews: (productId: string) =>
    api
      .get<ProductReview[]>(`/catalog/products/${productId}/reviews`)
      .then((r) => r.data),
  createReview: (productId: string, payload: { rating: number; comment: string }) =>
    api
      .post<{ id: string; isVerifiedPurchase: boolean; message: string }>(
        `/catalog/products/${productId}/reviews`,
        payload,
      )
      .then((r) => r.data),
}