import { useEffect, useState } from 'react';
import { VoucherCard } from '@/components/voucher/VoucherCard';
import { voucherApi, type UserVoucher } from '@/lib/api-service';
import { Loader2, Ticket, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function MyVouchersPage() {
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMyVouchers();
  }, []);

  const loadMyVouchers = async () => {
    try {
      setLoading(true);
      const data = await voucherApi.getMyVouchers();
      setUserVouchers(data);
    } catch (err) {
      setError('Không thể tải danh sách voucher của bạn');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const availableVouchers = userVouchers.filter(
    (uv) =>
      !uv.isUsed &&
      new Date(uv.expiresAt) >= now &&
      uv.voucher.status === 'active' &&
      uv.voucher.usedCount < uv.voucher.usageLimit
  );

  const usedVouchers = userVouchers.filter((uv) => uv.isUsed);

  const expiredVouchers = userVouchers.filter(
    (uv) =>
      !uv.isUsed &&
      (new Date(uv.expiresAt) < now ||
        uv.voucher.status !== 'active' ||
        uv.voucher.usedCount >= uv.voucher.usageLimit)
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Ticket className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Voucher Của Tôi</h1>
        </div>
        <p className="text-muted-foreground">
          Quản lý các mã giảm giá của bạn
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 mb-1">Có thể sử dụng</div>
          <div className="text-3xl font-bold text-green-900">
            {availableVouchers.length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 mb-1">Đã sử dụng</div>
          <div className="text-3xl font-bold text-blue-900">
            {usedVouchers.length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-700 mb-1">Đã hết hạn</div>
          <div className="text-3xl font-bold text-gray-900">
            {expiredVouchers.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="available" className="space-y-6">
        <TabsList>
          <TabsTrigger value="available">
            Có thể dùng ({availableVouchers.length})
          </TabsTrigger>
          <TabsTrigger value="used">
            Đã dùng ({usedVouchers.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Hết hạn ({expiredVouchers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {availableVouchers.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Bạn chưa có voucher nào
              </h3>
              <p className="text-muted-foreground">
                Khám phá các voucher có sẵn và bắt đầu tiết kiệm ngay!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableVouchers.map((uv) => (
                <div key={uv.id} className="relative">
                  <VoucherCard voucher={uv.voucher} />
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Nhận lúc: {new Date(uv.claimedAt).toLocaleDateString('vi-VN')}
                    </span>
                    <Badge variant="outline">
                      HSD: {new Date(uv.expiresAt).toLocaleDateString('vi-VN')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="used" className="space-y-4">
          {usedVouchers.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Chưa sử dụng voucher nào
              </h3>
              <p className="text-muted-foreground">
                Lịch sử sử dụng voucher sẽ hiển thị ở đây
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {usedVouchers.map((uv) => (
                <div key={uv.id} className="relative">
                  <VoucherCard voucher={uv.voucher} showCopyButton={false} />
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Đã dùng lúc:</span>
                      <span className="font-medium">
                        {uv.usedAt
                          ? new Date(uv.usedAt).toLocaleString('vi-VN')
                          : 'N/A'}
                      </span>
                    </div>
                    {uv.orderId && (
                      <div className="flex items-center justify-between">
                        <span>Đơn hàng:</span>
                        <span className="font-medium">{uv.orderId}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredVouchers.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Không có voucher hết hạn
              </h3>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {expiredVouchers.map((uv) => (
                <div key={uv.id} className="relative">
                  <VoucherCard voucher={uv.voucher} showCopyButton={false} />
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span>
                      Hết hạn: {new Date(uv.expiresAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
