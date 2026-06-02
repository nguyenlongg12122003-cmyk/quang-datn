import { BrowserRouter, Route, Routes, Navigate } from 'react-router';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';
// import { RouteProgress } from '@/components/layout/RouteProgress';
import { SimpleProgressBar } from '@/components/layout/SimpleProgressBar';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeletons';
import { useAuthStore } from '@/store/auth-store';
import { connectSocket, disconnectSocket } from '@/lib/socket';

// Layouts (not lazy loaded for better UX)
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Auth Pages (not lazy loaded - critical for first load)
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { HomePage } from '@/pages/HomePage';

// Lazy load customer pages
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CategoryPage = lazy(() => import('@/pages/CategoryPage').then(m => ({ default: m.CategoryPage })));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then(m => ({ default: m.WishlistPage })));
const ComparePage = lazy(() => import('@/pages/ComparePage').then(m => ({ default: m.ComparePage })));
const CustomizePage = lazy(() => import('@/pages/CustomizePage').then(m => ({ default: m.CustomizePage })));
const WholesalePage = lazy(() => import('@/pages/WholesalePage').then(m => ({ default: m.WholesalePage })));
const PaymentVNPayReturnPage = lazy(() => import('@/pages/PaymentVNPayReturnPage').then(m => ({ default: m.PaymentVNPayReturnPage })));
const PaymentPayOSReturnPage = lazy(() => import('@/pages/PaymentPayOSReturnPage').then(m => ({ default: m.PaymentPayOSReturnPage })));
const VouchersPage = lazy(() => import('@/pages/VouchersPage'));
const MyVouchersPage = lazy(() => import('@/pages/MyVouchersPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminVouchers = lazy(() => import('@/pages/admin/AdminVouchers').then(m => ({ default: m.AdminVouchers })));
const AdminInventory = lazy(() => import('@/pages/admin/AdminInventory').then(m => ({ default: m.AdminInventory })));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminChat = lazy(() => import('@/pages/admin/AdminChat').then(m => ({ default: m.AdminChat })));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories').then(m => ({ default: m.AdminCategories })));

// Admin guard component
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'staff') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket(token);
      return;
    }
    disconnectSocket();
  }, [isAuthenticated, token]);

  return (
    <>
      <Toaster richColors position="top-right" />
      <TooltipProvider>
        <BrowserRouter>
          {/* Use SimpleProgressBar as fallback if NProgress doesn't work */}
          <SimpleProgressBar />
          {/* <RouteProgress /> */}
          <ScrollToTop />
          <ScrollToTopButton />
          <Suspense fallback={<PageLoadingSkeleton />}>
            <Routes>
              {/* Auth pages (no layout) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Customer pages with layout */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrdersPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/customize" element={<CustomizePage />} />
                <Route path="/wholesale" element={<WholesalePage />} />
                <Route path="/vouchers" element={<VouchersPage />} />
                <Route path="/my-vouchers" element={<MyVouchersPage />} />
                <Route path="/payment/vnpay-return" element={<PaymentVNPayReturnPage />} />
                <Route path="/payment/payos-return" element={<PaymentPayOSReturnPage />} />
              </Route>

              {/* Admin pages with guard + layout */}
              <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="vouchers" element={<AdminVouchers />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="categories" element={<AdminCategories />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </>
  );
}

export default App;
