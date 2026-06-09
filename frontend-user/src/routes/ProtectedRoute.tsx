import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function ProtectedRoute() {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
