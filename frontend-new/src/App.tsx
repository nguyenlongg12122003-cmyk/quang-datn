import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AdminRoute } from '@/routes/AdminRoute'
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap'
import { useChatSocket } from '@/hooks/use-chat-socket'

// Customer pages (eager — core storefront)
import { HomePage } from '@/pages/HomePage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CategoryPage } from '@/pages/CategoryPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { CartPage } from '@/pages/CartPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { VouchersPage } from '@/pages/VouchersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Heavier / authenticated pages (lazy)
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })))
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })))
const MyVouchersPage = lazy(() => import('@/pages/MyVouchersPage').then((m) => ({ default: m.MyVouchersPage })))
const PaymentReturnPage = lazy(() => import('@/pages/PaymentReturnPage').then((m) => ({ default: m.PaymentReturnPage })))

// Admin pages (lazy bundle)
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
  // App-wide side effects that need the providers + router context.
  useAuthBootstrap()
  useChatSocket()

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Auth (no chrome) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Public storefront */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories/:slug" element={<CategoryPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="payment/vnpay-return" element={<PaymentReturnPage provider="vnpay" />} />
          <Route path="payment/payos-return" element={<PaymentReturnPage provider="payos" />} />

          {/* Authenticated customer */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="my-vouchers" element={<MyVouchersPage />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminLayout />}>
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
