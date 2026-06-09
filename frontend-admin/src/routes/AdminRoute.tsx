import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/login" replace />
  return <Outlet />
}