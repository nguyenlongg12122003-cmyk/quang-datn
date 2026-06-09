import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AdminRoute } from '@/routes/AdminRoute'
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap'
import { useChatSocket } from '@/hooks/use-chat-socket'

import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })))
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })))
const AdminBrandsPage = lazy(() => import('@/pages/admin/AdminBrandsPage').then((m) => ({ default: m.AdminBrandsPage })))
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })))
const AdminVouchersPage = lazy(() => import('@/pages/admin/AdminVouchersPage').then((m) => ({ default: m.AdminVouchersPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminSupportPage = lazy(() => import('@/pages/admin/AdminSupportPage').then((m) => ({ default: m.AdminSupportPage })))

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function AppRoutes() {
  useAuthBootstrap()
  useChatSocket()

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="brands" element={<AdminBrandsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="vouchers" element={<AdminVouchersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="support" element={<AdminSupportPage />} />
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}