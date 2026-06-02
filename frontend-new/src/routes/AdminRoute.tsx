import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) return <Navigate to="/login" replace />
  // Backend admin REST routes require role === 'admin' (staff is not enough).
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}
