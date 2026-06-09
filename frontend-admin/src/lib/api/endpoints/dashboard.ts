import { api } from '@/lib/api/axios'
import type { CustomerReport, DashboardStats, RevenueReport } from '@/types'

export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
  revenueReport: () =>
    api.get<RevenueReport>('/dashboard/reports/revenue').then((r) => r.data),
  customerReport: () =>
    api.get<CustomerReport>('/dashboard/reports/customers').then((r) => r.data),
}
