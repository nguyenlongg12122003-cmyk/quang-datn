import { api } from '@/lib/api/axios'
import type {
  Brand,
  Category,
  Product,
  ProductReview,
} from '@/types'

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
  // Categories
  listCategories: () =>
    api.get<Category[]>('/catalog/categories').then((r) => r.data),
  createCategory: (payload: Partial<Category>) =>
    api.post<{ id: string }>('/catalog/categories', payload).then((r) => r.data),
  updateCategory: (id: string, payload: Partial<Category>) =>
    api.put<{ ok: true }>(`/catalog/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete<{ ok: true }>(`/catalog/categories/${id}`).then((r) => r.data),

  // Brands
  listBrands: () => api.get<Brand[]>('/catalog/brands').then((r) => r.data),
  createBrand: (payload: Partial<Brand>) =>
    api.post<{ id: string }>('/catalog/brands', payload).then((r) => r.data),
  updateBrand: (id: string, payload: Partial<Brand>) =>
    api.put<{ ok: true }>(`/catalog/brands/${id}`, payload).then((r) => r.data),
  deleteBrand: (id: string) =>
    api.delete<{ ok: true }>(`/catalog/brands/${id}`).then((r) => r.data),

  // Products
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
  createProduct: (payload: Partial<Product>) =>
    api
      .post<{ id: string; message: string }>('/catalog/products', payload)
      .then((r) => r.data),
  updateProduct: (id: string, payload: Partial<Product>) =>
    api
      .put<{ message: string }>(`/catalog/products/${id}`, payload)
      .then((r) => r.data),
  deleteProduct: (id: string) =>
    api.delete<{ message: string }>(`/catalog/products/${id}`).then((r) => r.data),
  updateStock: (id: string, stock: number) =>
    api
      .patch<{ message: string }>(`/catalog/products/${id}/stock`, { stock })
      .then((r) => r.data),

  // Reviews
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
