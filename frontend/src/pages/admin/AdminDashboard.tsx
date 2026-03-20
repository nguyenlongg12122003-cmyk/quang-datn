import { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { dashboardApi, formatCompactMoney, formatPrice, type DashboardStats } from '@/lib/api-service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#03045E', '#023E8A', '#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF'];

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!stats) return <div className="text-center py-20 text-muted-foreground">Không tải được dữ liệu</div>;

  const statusLabels: Record<string, string> = { pending:'Chờ XN', confirmed:'Đã XN', processing:'Xử lý', shipping:'Đang giao', delivered:'Đã giao', cancelled:'Đã hủy', returned:'Hoàn hàng' };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Doanh thu', value: formatPrice(stats.totalRevenue), sub: `${stats.newCustomersThisMonth} KH mới tháng này`, icon: DollarSign, bg: 'bg-green-100', ic: 'text-green-600' },
          { label: 'Tổng đơn hàng', value: stats.totalOrders, sub: `${stats.pendingOrders} đơn chờ xử lý`, icon: ShoppingCart, bg: 'bg-blue-100', ic: 'text-blue-600' },
          { label: 'Sản phẩm', value: stats.totalProducts, sub: `${stats.lowStockProducts} cần nhập hàng`, icon: Package, bg: 'bg-purple-100', ic: 'text-purple-600' },
          { label: 'Khách hàng', value: stats.totalCustomers, sub: `Tỉ lệ hoàn: ${stats.returnRate}%`, icon: Users, bg: 'bg-orange-100', ic: 'text-orange-600' },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500" />{c.sub}</p>
                </div>
                <div className={`${c.bg} p-3 rounded-full`}><c.icon className={`h-6 w-6 ${c.ic}`} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Doanh thu 12 tháng</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactMoney(Number(v) || 0)} />
                <Tooltip formatter={v => formatPrice(Number(v) || 0)} />
                <Bar dataKey="revenue" fill="#0077B6" radius={[4,4,0,0]} name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by status pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">Phân bổ đơn hàng</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.ordersByStatus.map(s => ({ ...s, name: statusLabels[s.status] || s.status, value: s.count }))} cx="40%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                  {stats.ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {stats.ordersByStatus.map((s, i) => (
                <Badge key={i} variant="outline" style={{ borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}>
                  {statusLabels[s.status] || s.status}: {s.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top sản phẩm bán chạy</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground w-6">#{i+1}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sold} đã bán</div>
                </div>
                <div className="font-bold text-sm">{formatPrice(p.revenue)}</div>
              </div>
            ))}
            {stats.topProducts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu doanh thu</p>}
          </div>
        </CardContent>
      </Card>

      {/* Low stock / pending alerts */}
      {(stats.pendingOrders > 0 || stats.lowStockProducts > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3 text-orange-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {stats.pendingOrders > 0 && `${stats.pendingOrders} đơn đang chờ xác nhận. `}
              {stats.lowStockProducts > 0 && `${stats.lowStockProducts} sản phẩm sắp hết hàng.`}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
