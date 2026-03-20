import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dashboardApi, formatCompactMoney, formatPrice } from '@/lib/api-service';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

export function AdminReports() {
  const [stats, setStats] = useState<{ totalRevenue: number; totalOrders: number; totalProducts: number; totalCustomers: number; returnRate: number } | null>(null);
  const [revenueData, setRevenueData] = useState<{ monthly: {month:string;revenue:number;orders:number}[]; byCategory: {name:string;revenue:number;orders:number}[] } | null>(null);
  const [customerData, setCustomerData] = useState<{month:string;newCustomers:number;totalCustomers:number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getRevenueReport(),
      dashboardApi.getCustomerReport(),
    ]).then(([s, r, c]) => {
      setStats(s);
      setRevenueData(r);
      setCustomerData(c);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Báo cáo &amp; Thống kê</h2>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="products">Sản phẩm</TabsTrigger>
          <TabsTrigger value="customers">Khách hàng</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Tổng doanh thu', value: formatPrice(stats?.totalRevenue || 0) },
              { label: 'Tổng đơn hàng', value: `${stats?.totalOrders || 0} đơn` },
              { label: 'Tỉ lệ hoàn hàng', value: `${stats?.returnRate || 0}%` },
            ].map((c, i) => (
              <Card key={i}><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold mt-1">{c.value}</div>
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Doanh thu theo tháng</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData?.monthly || []}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0077B6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0077B6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactMoney(Number(v) || 0)} />
                  <Tooltip formatter={v => [formatPrice(Number(v) || 0), 'Doanh thu']} />
                  <Area type="monotone" dataKey="revenue" stroke="#0077B6" fill="url(#rev)" name="Doanh thu" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {revenueData?.byCategory && revenueData.byCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Doanh thu theo danh mục</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueData.byCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCompactMoney(Number(v) || 0)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={v => formatPrice(Number(v) || 0)} />
                    <Bar dataKey="revenue" fill="#00B4D8" name="Doanh thu" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Tổng sản phẩm', value: stats?.totalProducts || 0 },
              { label: 'Doanh thu TB/sản phẩm', value: formatPrice(stats && stats.totalProducts ? stats.totalRevenue / stats.totalProducts : 0) },
            ].map((c, i) => (
              <Card key={i}><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold mt-1">{c.value}</div>
              </CardContent></Card>
            ))}
          </div>
          {revenueData?.byCategory && (
            <Card>
              <CardHeader><CardTitle className="text-base">Số đơn theo danh mục</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueData.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#0077B6" name="Đơn hàng" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Tổng khách hàng', value: stats?.totalCustomers || 0 },
              { label: 'KH mới tháng gần nhất', value: customerData[customerData.length-1]?.newCustomers || 0 },
            ].map((c, i) => (
              <Card key={i}><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold mt-1">{c.value}</div>
              </CardContent></Card>
            ))}
          </div>
          {customerData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Tăng trưởng khách hàng</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={customerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newCustomers" stroke="#0077B6" name="KH mới" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="totalCustomers" stroke="#48CAE4" name="Tổng KH" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {customerData.length === 0 && <p className="text-center py-8 text-muted-foreground">Chưa có dữ liệu khách hàng</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
