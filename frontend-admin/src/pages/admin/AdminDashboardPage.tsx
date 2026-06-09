import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats, useRevenueReport } from '@/features/admin/api'
import { formatCurrency, formatNumber } from '@/lib/format'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

const CHART_COLORS = ['#2890b8', '#58a8c8', '#88c4d8', '#b8d8e8', '#e8f4f8', '#1f7497', '#155d7a']

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: revenue } = useRevenueReport()

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  const kpis = [
    { label: 'Doanh thu', value: formatCurrency(stats.totalRevenue), icon: DollarSign, accent: 'bg-primary/10 text-primary' },
    { label: 'Đơn hàng', value: formatNumber(stats.totalOrders), icon: ShoppingBag, accent: 'bg-sky-100 text-sky-700' },
    { label: 'Sản phẩm', value: formatNumber(stats.totalProducts), icon: Package, accent: 'bg-indigo-100 text-indigo-700' },
    { label: 'Khách hàng', value: formatNumber(stats.totalCustomers), icon: Users, accent: 'bg-cyan-100 text-cyan-700' },
  ]

  const ordersByStatus = stats.ordersByStatus.map((o) => ({
    name: ORDER_STATUS_LABELS[o.status],
    value: o.count,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>

      {/* KPI bento */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
              <span className={`grid size-12 place-items-center rounded-xl ${kpi.accent}`}>
                <kpi.icon className="size-6" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Đơn chờ xử lý" value={formatNumber(stats.pendingOrders)} icon={ShoppingBag} />
        <MetricCard label="Sản phẩm sắp hết" value={formatNumber(stats.lowStockProducts)} icon={AlertTriangle} warn />
        <MetricCard label="Tỉ lệ hoàn trả" value={`${stats.returnRate}%`} icon={Package} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue by month */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Doanh thu theo tháng</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByMonth}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2890b8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2890b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8f4f8" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v / 1_000_000}M`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#2890b8" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ordersByStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {ordersByStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <span className="line-clamp-1 flex-1 text-sm">{p.name}</span>
                <span className="text-sm text-muted-foreground">{formatNumber(p.sold)} đã bán</span>
                <span className="text-sm font-medium">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Revenue by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doanh thu theo danh mục</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue?.byCategory ?? []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} fontSize={12} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="revenue" fill="#58a8c8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string
  icon: typeof Package
  warn?: boolean
}

function MetricCard({ label, value, icon: Icon, warn }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`grid size-10 place-items-center rounded-lg ${warn ? 'bg-amber-100 text-amber-600' : 'bg-secondary text-primary'}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
