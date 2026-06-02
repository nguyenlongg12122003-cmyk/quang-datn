import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '@/lib/api/endpoints/catalog'
import { dashboardApi } from '@/lib/api/endpoints/dashboard'
import { userApi, type AdminUserQuery } from '@/lib/api/endpoints/users'
import { voucherApi } from '@/lib/api/endpoints/vouchers'
import { queryKeys } from '@/lib/query/keys'
import type { Brand, Category, Product, UserRole, UserStatus, Voucher } from '@/types'

// ── Dashboard ────────────────────────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({ queryKey: queryKeys.dashboard.stats, queryFn: dashboardApi.stats })
}
export function useRevenueReport() {
  return useQuery({ queryKey: queryKeys.dashboard.revenue, queryFn: dashboardApi.revenueReport })
}
export function useCustomerReport() {
  return useQuery({ queryKey: queryKeys.dashboard.customers, queryFn: dashboardApi.customerReport })
}

// ── Products ─────────────────────────────────────────────────────────────────
function useInvalidateProducts() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: (payload: Partial<Product>) => catalogApi.createProduct(payload),
    onSuccess: invalidate,
  })
}
export function useUpdateProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) =>
      catalogApi.updateProduct(id, payload),
    onSuccess: invalidate,
  })
}
export function useDeleteProduct() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteProduct(id),
    onSuccess: invalidate,
  })
}
export function useUpdateStock() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      catalogApi.updateStock(id, stock),
    onSuccess: invalidate,
  })
}

// ── Categories ───────────────────────────────────────────────────────────────
export function useSaveCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Partial<Category> }) => {
      if (id) await catalogApi.updateCategory(id, payload)
      else await catalogApi.createCategory(payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  })
}
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  })
}

// ── Brands ───────────────────────────────────────────────────────────────────
export function useSaveBrand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Partial<Brand> }) => {
      if (id) await catalogApi.updateBrand(id, payload)
      else await catalogApi.createBrand(payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.brands }),
  })
}
export function useDeleteBrand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteBrand(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.brands }),
  })
}

// ── Vouchers ─────────────────────────────────────────────────────────────────
export function useSaveVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Partial<Voucher> }) => {
      if (id) await voucherApi.update(id, payload)
      else await voucherApi.create(payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vouchers'] }),
  })
}
export function useDeleteVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => voucherApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vouchers'] }),
  })
}

// ── Users ────────────────────────────────────────────────────────────────────
export function useAdminUsers(query: AdminUserQuery) {
  return useQuery({
    queryKey: queryKeys.users.adminList(query),
    queryFn: () => userApi.list(query),
  })
}
export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      userApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'admin'] }),
  })
}
export function useSetUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => userApi.setRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'admin'] }),
  })
}
