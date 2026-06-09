import { api } from '@/lib/api/axios'
import type { Brand, Category, Product } from '@/types'

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
  createCategory: (payload: Partial<Category>) =>
    api.post<{ id: string }>('/catalog/categories', payload).then((r) => r.data),
  updateCategory: (id: string, payload: Partial<Category>) =>
    api.put<{ ok: true }>(`/catalog/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete<{ ok: true }>(`/catalog/categories/${id}`).then((r) => r.data),

  listBrands: () => api.get<Brand[]>('/catalog/brands').then((r) => r.data),
  createBrand: (payload: Partial<Brand>) =>
    api.post<{ id: string }>('/catalog/brands', payload).then((r) => r.data),
  updateBrand: (id: string, payload: Partial<Brand>) =>
    api.put<{ ok: true }>(`/catalog/brands/${id}`, payload).then((r) => r.data),
  deleteBrand: (id: string) =>
    api.delete<{ ok: true }>(`/catalog/brands/${id}`).then((r) => r.data),

  listProducts: (query: ProductQuery = {}) =>
    api
      .get<ProductListResponse>('/catalog/products', { params: query })
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
}