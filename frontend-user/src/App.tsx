import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap'
import { useChatSocket } from '@/hooks/use-chat-socket'

import { HomePage } from '@/pages/HomePage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CategoryPage } from '@/pages/CategoryPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { CartPage } from '@/pages/CartPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { VouchersPage } from '@/pages/VouchersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })))
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })))
const MyVouchersPage = lazy(() => import('@/pages/MyVouchersPage').then((m) => ({ default: m.MyVouchersPage })))
const PaymentReturnPage = lazy(() => import('@/pages/PaymentReturnPage').then((m) => ({ default: m.PaymentReturnPage })))

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
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories/:slug" element={<CategoryPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="payment/vnpay-return" element={<PaymentReturnPage provider="vnpay" />} />
          <Route path="payment/payos-return" element={<PaymentReturnPage provider="payos" />} />

          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="my-vouchers" element={<MyVouchersPage />} />
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