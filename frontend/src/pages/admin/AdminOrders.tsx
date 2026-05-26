import { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle, XCircle, Truck, RotateCcw, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { orderApi, formatPrice, type Order, type OrderStatus } from '@/lib/api-service';
import { toast } from 'sonner';

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending:    { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
  confirmed:  { label: 'Đã xác nhận',  color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Đang xử lý',   color: 'bg-indigo-100 text-indigo-800' },
  shipping:   { label: 'Đang giao',    color: 'bg-purple-100 text-purple-800' },
  delivered:  { label: 'Đã giao',      color: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Đã hủy',       color: 'bg-red-100 text-red-800' },
  returned:   { label: 'Hoàn hàng',    color: 'bg-orange-100 text-orange-800' },
};

const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipping', 'delivered'];

function getPaymentLabel(paymentStatus: string) {
  if (paymentStatus === 'paid') return 'Đã thanh toán';
  if (paymentStatus === 'refunded') return 'Đã hoàn tiền';
  if (paymentStatus === 'failed') return 'Thanh toán lỗi';
  return 'Chưa thanh toán';
}

function getActionButtons(order: Order) {
  if (order.returnRequest?.status === 'pending') return [];

  if (order.status === 'pending') {
    return [
      { status: 'confirmed', label: 'Xác nhận đơn', icon: CheckCircle, variant: 'default' as const },
      { status: 'cancelled', label: 'Hủy đơn', icon: XCircle, variant: 'destructive' as const },
    ];
  }

  if (order.status === 'confirmed') {
    return [
      { status: 'processing', label: 'Bắt đầu xử lý', icon: Loader2, variant: 'default' as const },
      { status: 'cancelled', label: 'Hủy đơn', icon: XCircle, variant: 'destructive' as const },
    ];
  }

  if (order.status === 'processing') {
    return [
      { status: 'shipping', label: 'Bàn giao vận chuyển', icon: Truck, variant: 'default' as const },
      { status: 'cancelled', label: 'Hủy đơn', icon: XCircle, variant: 'destructive' as const },
    ];
  }

  if (order.status === 'shipping') {
    return [
      { status: 'delivered', label: 'Xác nhận đã giao', icon: CheckCircle, variant: 'default' as const },
    ];
  }

  return [];
}

function getImageFileExtension(dataUrl?: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return 'png';
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  if (!match?.[1]) return 'png';
  const subtype = match[1].toLowerCase();
  if (subtype.includes('jpeg')) return 'jpg';
  if (subtype.includes('svg')) return 'svg';
  if (subtype.includes('webp')) return 'webp';
  return 'png';
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await orderApi.getAllOrders({ status: statusFilter !== 'all' ? statusFilter : undefined, q: searchQuery || undefined });
      setOrders(data);
    } catch { toast.error('Không tải được đơn hàng'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const handleSearch = () => fetchOrders();

  const handleStatus = async (id: string, status: string, note?: string) => {
    setUpdating(id);
    try {
      await orderApi.updateStatus(id, status, note);
      toast.success('Đã cập nhật trạng thái đơn hàng');
      await fetchOrders();
    } catch { toast.error('Lỗi cập nhật trạng thái'); }
    finally { setUpdating(null); }
  };

  const handleReturn = async (id: string, action: 'approved' | 'rejected') => {
    setUpdating(id);
    try {
      await orderApi.approveReturn(id, action);
      toast.success(action === 'approved' ? 'Đã duyệt hoàn hàng' : 'Đã từ chối hoàn hàng');
      fetchOrders();
    } catch { toast.error('Lỗi xử lý hoàn hàng'); }
    finally { setUpdating(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Quản lý đơn hàng</h2>
          <p className="text-sm text-muted-foreground">{orders.length} đơn hàng</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo mã đơn, tên KH..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead><TableHead>Khách hàng</TableHead>
                  <TableHead>Sản phẩm</TableHead><TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead className="text-center">Thanh toán</TableHead><TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Ngày đặt</TableHead><TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="text-sm">{order.shippingAddress?.name}</div>
                      <div className="text-xs text-muted-foreground">{order.shippingAddress?.phone}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.items?.length} sản phẩm
                      {(order.items?.filter(i => i.customization).length ?? 0) > 0 && (
                        <div className="text-xs text-purple-600 mt-0.5">{order.items.filter(i => i.customization).length} tùy chỉnh</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(order.total)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={order.paymentStatus === 'paid' ? 'default' : order.paymentStatus === 'refunded' ? 'destructive' : 'outline'}>
                        {order.paymentStatus === 'paid' ? 'Đã TT' : order.paymentStatus === 'refunded' ? 'Hoàn tiền' : 'Chưa TT'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusConfig[order.status]?.color}>{statusConfig[order.status]?.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="!w-[96vw] !max-w-[96vw] xl:!max-w-[1200px] max-h-[92vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Chi tiết đơn hàng {order.id}</DialogTitle></DialogHeader>
                          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
                            <div className="space-y-5">
                              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-center xl:justify-between">
                                <div>
                                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Đơn hàng</div>
                                  <div className="mt-1 text-xl font-semibold text-slate-900">{order.id}</div>
                                  <div className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={statusConfig[order.status]?.color}>{statusConfig[order.status]?.label}</Badge>
                                  <Badge variant={order.paymentStatus === 'paid' ? 'default' : order.paymentStatus === 'refunded' ? 'destructive' : 'outline'}>
                                    {getPaymentLabel(order.paymentStatus)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="rounded-xl border p-4">
                                <div className="mb-3 text-sm font-semibold">Tiến trình đơn hàng</div>
                                <div className="grid gap-3 md:grid-cols-5">
                                  {statusFlow.map((step, index) => {
                                    const activeIndex = statusFlow.indexOf(order.status as OrderStatus);
                                    const isDone = activeIndex >= index;
                                    const isCurrent = order.status === step;
                                    return (
                                      <div
                                        key={step}
                                        className={`rounded-lg border px-3 py-3 text-center transition ${
                                          isCurrent
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : isDone
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                              : 'border-slate-200 bg-white text-slate-500'
                                        }`}
                                      >
                                        <div className="text-[11px] uppercase tracking-[0.16em]">Bước {index + 1}</div>
                                        <div className="mt-1 text-sm font-semibold">{statusConfig[step].label}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {(order.status === 'cancelled' || order.status === 'returned') && (
                                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    Trạng thái cuối: {statusConfig[order.status].label}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-xl border p-4">
                                <h4 className="mb-3 text-sm font-semibold">Sản phẩm</h4>
                                <div className="space-y-3">
                                  {order.items?.map((item, i) => (
                                    <div key={i} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                                      <img src={item.productImage} alt="" className="h-16 w-16 rounded object-cover" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">{item.productName}</div>
                                        {item.customization && (
                                          <div className="mt-1 text-xs text-purple-600">
                                            Tùy chỉnh: {item.customization.type} - {item.customization.inputType === 'image' ? 'Ảnh thiết kế' : item.customization.text}
                                          </div>
                                        )}
                                        {item.customization?.inputType === 'image' && item.customization.text?.startsWith('data:image/') && (
                                          <div className="mt-2 flex items-center gap-2">
                                            <img src={item.customization.text} alt="Logo tùy chỉnh" className="h-12 w-12 rounded border object-cover" />
                                            <a
                                              href={item.customization.text}
                                              download={`${order.id}-${item.productId}-logo.${getImageFileExtension(item.customization.text)}`}
                                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                              <Download className="h-3 w-3" /> Tải logo
                                            </a>
                                          </div>
                                        )}
                                        <div className="mt-1 text-xs text-muted-foreground">Số lượng: {item.quantity}</div>
                                      </div>
                                      <div className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-xl border p-4">
                                <h4 className="mb-3 text-sm font-semibold">Lịch sử trạng thái</h4>
                                <div className="space-y-3">
                                  {order.timeline?.map((entry, i) => (
                                    <div key={`${entry.status}-${entry.date}-${i}`} className="flex gap-3">
                                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                                      <div className="flex-1 rounded-lg border border-slate-100 px-3 py-2">
                                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                          <div className="text-sm font-medium">{statusConfig[entry.status as OrderStatus]?.label || entry.status}</div>
                                          <div className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleString('vi-VN')}</div>
                                        </div>
                                        {entry.note && <div className="mt-1 text-sm text-muted-foreground">{entry.note}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-5">
                              <div className="rounded-xl border p-4">
                                <h4 className="mb-3 text-sm font-semibold">Thông tin giao hàng</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="font-medium">{order.shippingAddress?.name} - {order.shippingAddress?.phone}</div>
                                  <div className="text-muted-foreground">{order.shippingAddress?.street}, {order.shippingAddress?.ward}, {order.shippingAddress?.district}, {order.shippingAddress?.city}</div>
                                  <div className="grid gap-2 pt-2 text-sm md:grid-cols-2">
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Thanh toán</div>
                                      <div className="mt-1 font-medium">{order.paymentMethod?.toUpperCase()}</div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Vận chuyển</div>
                                      <div className="mt-1 font-medium">{order.shippingMethod}</div>
                                    </div>
                                  </div>
                                </div>
                                {order.note && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-medium">Ghi chú:</span> {order.note}</div>}
                              </div>

                              <div className="rounded-xl border p-4">
                                <h4 className="mb-3 text-sm font-semibold">Tổng kết đơn hàng</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span>Tạm tính</span><span>{formatPrice(order.subtotal)}</span></div>
                                  <div className="flex justify-between"><span>Phí ship</span><span>{formatPrice(order.shippingFee)}</span></div>
                                  {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá</span><span>-{formatPrice(order.discount)}</span></div>}
                                  <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Tổng cộng</span><span className="text-red-600">{formatPrice(order.total)}</span></div>
                                </div>
                              </div>

                              <div className="rounded-xl border p-4">
                                <h4 className="mb-3 text-sm font-semibold">Thao tác trạng thái</h4>
                                <div className="space-y-3">
                                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                    Trạng thái hiện tại: <span className="font-semibold text-slate-900">{statusConfig[order.status]?.label}</span>
                                  </div>
                                  <div className="grid gap-2">
                                    {getActionButtons(order).map((action) => {
                                      const Icon = action.icon;
                                      return (
                                        <Button
                                          key={action.status}
                                          size="sm"
                                          variant={action.variant}
                                          className="justify-start gap-2"
                                          disabled={updating === order.id}
                                          onClick={() => handleStatus(order.id, action.status)}
                                        >
                                          <Icon className={`h-4 w-4 ${action.status === 'processing' && updating === order.id ? 'animate-spin' : ''}`} />
                                          {action.label}
                                        </Button>
                                      );
                                    })}
                                    {getActionButtons(order).length === 0 && (
                                      <div className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
                                        Không còn thao tác chuyển trạng thái trực tiếp cho đơn này.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {order.returnRequest && order.returnRequest.status === 'pending' && (
                                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                                  <div className="text-sm font-semibold text-orange-800">Yêu cầu hoàn hàng</div>
                                  <div className="mt-1 text-sm text-orange-700">Lý do: {order.returnRequest.reason}</div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" className="gap-2 border-orange-300 bg-white" disabled={updating === order.id} onClick={() => handleReturn(order.id, 'approved')}>
                                      <RotateCcw className="h-4 w-4" /> Duyệt hoàn hàng
                                    </Button>
                                    <Button size="sm" variant="outline" className="gap-2 border-red-300 bg-white text-red-600" disabled={updating === order.id} onClick={() => handleReturn(order.id, 'rejected')}>
                                      <XCircle className="h-4 w-4" /> Từ chối yêu cầu
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && !loading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có đơn hàng nào</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
