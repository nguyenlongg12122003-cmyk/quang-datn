import { useState, useEffect } from 'react';
import { Package, Eye, RotateCcw, CheckCircle, Clock, Truck, XCircle, AlertTriangle, Sparkles, X, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { orderApi, formatPrice, type Order, type OrderStatus } from '@/lib/api-service';
import { toast } from 'sonner';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Đang xử lý', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  shipping: { label: 'Đang giao', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Đã giao', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: XCircle },
  returned: { label: 'Hoàn hàng', color: 'bg-orange-100 text-orange-800', icon: RotateCcw },
};

const paymentMethodLabels: Record<string, string> = {
  cod: 'COD (Tiền mặt)',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  vnpay: 'VNPay',
  payos: 'PayOS',
};

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const status = statusConfig[order.status];
  const customizedItems = order.items.filter(item => item.customization);
  return (
    <DialogContent className="max-w-2xl max-h-[90vh]">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-base">Chi tiết đơn hàng #{order.id}</DialogTitle>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] pr-2">
        <div className="space-y-5">
          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Trạng thái đơn hàng</h3>
            <div className="flex items-start gap-1 overflow-x-auto pb-2">
              {order.timeline.map((event, i) => {
                const es = statusConfig[event.status as OrderStatus];
                const isLast = i === order.timeline.length - 1;
                return (
                  <div key={i} className="flex items-center gap-1 shrink-0">
                    <div className={`flex flex-col items-center gap-1`}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${isLast ? 'bg-primary text-primary-foreground' : 'bg-green-100 text-green-700'}`}>
                        {i + 1}
                      </div>
                      <div className="text-xs text-center max-w-[70px]">
                        <div className={`font-medium ${isLast ? 'text-primary' : 'text-foreground'}`}>{es?.label || event.status}</div>
                        <div className="text-muted-foreground">{new Date(event.date).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>
                    {!isLast && <div className="w-8 h-0.5 bg-green-300 mb-5" />}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Sản phẩm ({order.items.length})</h3>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productName} className="w-14 h-14 object-cover rounded-lg border" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border bg-muted flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.productName}</div>
                    {item.customization && (
                      <div className="text-xs text-purple-600 flex items-center gap-1 mt-0.5">
                        <Sparkles className="h-3 w-3" />
                        {item.customization.inputType === 'image'
                          ? `${item.customization.type}: Ảnh thiết kế`
                          : `${item.customization.type}: ${item.customization.text}`}
                      </div>
                    )}
                    {item.customization?.inputType === 'image' && item.customization.text?.startsWith('data:image/') && (
                      <img src={item.customization.text} alt="Logo tùy chỉnh" className="mt-1 h-12 w-12 rounded border object-cover" />
                    )}
                    <div className="text-sm text-muted-foreground">x{item.quantity} × {formatPrice(item.price)}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>
          </div>

          {customizedItems.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-purple-700">
                  <Sparkles className="h-4 w-4" /> Thông tin tùy chỉnh ({customizedItems.length})
                </h3>
                <div className="space-y-2">
                  {customizedItems.map((item, idx) => (
                    <div key={`${item.productId}-${idx}`} className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                      <div className="text-sm font-medium text-foreground">{item.productName}</div>
                      <div className="text-xs text-purple-700 mt-1">Loại: {item.customization?.type}</div>
                      {item.customization?.inputType === 'image' ? (
                        <div className="mt-1">
                          <div className="text-xs text-purple-700 mb-1">Nội dung: Ảnh thiết kế</div>
                          {item.customization.text?.startsWith('data:image/') && (
                            <img src={item.customization.text} alt="Logo tùy chỉnh" className="h-20 w-20 rounded border object-cover" />
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-purple-900 mt-1">Nội dung: {item.customization?.text}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Shipping Address */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Địa chỉ giao hàng</h3>
            <div className="text-sm bg-muted/30 rounded-lg p-3">
              <div className="font-medium">{order.shippingAddress.name} — {order.shippingAddress.phone}</div>
              <div className="text-muted-foreground mt-1">
                {order.shippingAddress.street}{order.shippingAddress.ward ? `, ${order.shippingAddress.ward}` : ''}{order.shippingAddress.district ? `, ${order.shippingAddress.district}` : ''}, {order.shippingAddress.city}
              </div>
            </div>
          </div>

          {/* Payment & Total */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Thanh toán</h3>
            <div className="space-y-1.5 text-sm bg-muted/30 rounded-lg p-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Phương thức</span><span>{paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển</span><span>{formatPrice(order.shippingFee)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá</span><span>-{formatPrice(order.discount)}</span></div>}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base"><span>Tổng cộng</span><span className="text-red-600">{formatPrice(order.total)}</span></div>
            </div>
          </div>

          {/* Return Request */}
          {order.returnRequest && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm">Yêu cầu hoàn hàng</span>
                <Badge className={order.returnRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.returnRequest.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {order.returnRequest.status === 'pending' ? 'Đang xử lý' : order.returnRequest.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{order.returnRequest.reason}</p>
            </div>
          )}

          {order.note && (
            <div className="text-sm"><span className="font-medium">Ghi chú:</span> {order.note}</div>
          )}
        </div>
      </ScrollArea>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-1" /> Đóng</Button>
      </div>
    </DialogContent>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [returnReason, setReturnReason] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  useEffect(() => {
    orderApi.getMyOrders().then(setOrders).catch(() => toast.error('Không tải được đơn hàng'));
  }, []);

  const filteredOrders = selectedTab === 'all' ? orders : orders.filter(o => o.status === selectedTab);

  const handleReturn = async (id: string) => {
    if (!returnReason.trim()) { toast.error('Vui lòng nhập lý do hoàn hàng'); return; }
    try {
      await orderApi.returnRequest(id, returnReason);
      toast.success('Yêu cầu hoàn hàng đã được gửi!');
      setReturnReason('');
      setOrders(prev => prev.map(o => o.id === id ? { ...o, returnRequest: { reason: returnReason, status: 'pending', createdAt: new Date().toISOString() } } : o));
    } catch { toast.error('Lỗi gửi yêu cầu hoàn hàng'); }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Đơn hàng của tôi</h1>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="pending">Chờ xác nhận</TabsTrigger>
          <TabsTrigger value="confirmed">Đã xác nhận</TabsTrigger>
          <TabsTrigger value="shipping">Đang giao</TabsTrigger>
          <TabsTrigger value="delivered">Đã giao</TabsTrigger>
          <TabsTrigger value="cancelled">Đã hủy</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Không có đơn hàng nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => {
                const status = statusConfig[order.status];
                const customizedItems = order.items.filter(item => item.customization);
                return (
                  <Card key={order.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base">#{order.id}</CardTitle>
                          <Badge className={status.color}>{status.label}</Badge>
                          <Badge variant="outline">{paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod}</Badge>
                          {customizedItems.length > 0 && (
                            <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                              <Sparkles className="h-3 w-3 mr-1" /> {customizedItems.length} tùy chỉnh
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Items preview */}
                      <div className="space-y-2 mb-4">
                        {order.items.slice(0, 2).map((item, i) => (
                          <div key={i} className="flex gap-3 items-center">
                            {item.productImage ? (
                              <img src={item.productImage} alt={item.productName} className="w-12 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.productName}</div>
                              {item.customization && (
                                <div className="text-xs text-purple-600 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  {item.customization.inputType === 'image'
                                    ? `${item.customization.type}: Ảnh thiết kế`
                                    : `${item.customization.type}: ${item.customization.text}`}
                                </div>
                              )}
                              {item.customization?.inputType === 'image' && item.customization.text?.startsWith('data:image/') && (
                                <img src={item.customization.text} alt="Logo tùy chỉnh" className="mt-1 h-10 w-10 rounded border object-cover" />
                              )}
                              <div className="text-sm text-muted-foreground">x{item.quantity}</div>
                            </div>
                            <div className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</div>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-muted-foreground pl-15">+{order.items.length - 2} sản phẩm khác</p>
                        )}
                      </div>

                      {customizedItems.length > 0 && (
                        <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                          <div className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Thông tin tùy chỉnh
                          </div>
                          <div className="space-y-1">
                            {customizedItems.slice(0, 2).map((item, idx) => (
                              <p key={`${item.productId}-${idx}`} className="text-xs text-purple-900">
                                {item.productName}: {item.customization?.type} - {item.customization?.inputType === 'image' ? 'Ảnh thiết kế' : item.customization?.text}
                              </p>
                            ))}
                            {customizedItems.length > 2 && (
                              <p className="text-xs text-purple-700">+{customizedItems.length - 2} tùy chỉnh khác</p>
                            )}
                          </div>
                        </div>
                      )}

                      <Separator className="mb-4" />

                      {/* Return request */}
                      {order.returnRequest && (
                        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-sm">Yêu cầu hoàn hàng</span>
                            <Badge className={order.returnRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.returnRequest.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {order.returnRequest.status === 'pending' ? 'Đang xử lý' : order.returnRequest.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewingOrder(order)}>
                            <Eye className="h-3 w-3" /> Chi tiết
                          </Button>
                          {order.status === 'delivered' && !order.returnRequest && (
                            <Dialog>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => {}}>
                                <RotateCcw className="h-3 w-3" /> Hoàn hàng
                              </Button>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Yêu cầu hoàn hàng - #{order.id}</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Lý do hoàn hàng</Label>
                                    <Textarea placeholder="Mô tả lý do bạn muốn hoàn hàng..." value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                                  </div>
                                  <Button onClick={() => void handleReturn(order.id)} className="w-full">Gửi yêu cầu</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Tổng cộng</div>
                          <div className="font-bold text-red-600">{formatPrice(order.total)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Detail Modal */}
      <Dialog open={!!viewingOrder} onOpenChange={open => { if (!open) setViewingOrder(null); }}>
        {viewingOrder && <OrderDetail order={viewingOrder} onClose={() => setViewingOrder(null)} />}
      </Dialog>
    </div>
  );
}
