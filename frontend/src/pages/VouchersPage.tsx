import { useEffect, useState } from 'react';
import { VoucherCard } from '@/components/voucher/VoucherCard';
import { voucherApi, type Voucher } from '@/lib/api-service';
import { Loader2, Ticket, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const data = await voucherApi.getAll();
      setVouchers(data);
    } catch (err) {
      setError('Không thể tải danh sách voucher');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const activeVouchers = vouchers.filter(
    (v) =>
      v.status === 'active' &&
      new Date(v.startDate) <= now &&
      new Date(v.endDate) >= now &&
      v.usedCount < v.usageLimit
  );

  const upcomingVouchers = vouchers.filter(
    (v) => v.status === 'active' && new Date(v.startDate) > now
  );

  const expiredVouchers = vouchers.filter(
    (v) =>
      v.status !== 'active' ||
      new Date(v.endDate) < now ||
      v.usedCount >= v.usageLimit
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
          <h1 className="text-3xl font-bold">Mã Giảm Giá</h1>
        </div>
        <p className="text-muted-foreground">
          Khám phá các mã giảm giá hấp dẫn cho đơn hàng của bạn
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            Đang hoạt động ({activeVouchers.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Sắp diễn ra ({upcomingVouchers.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Đã hết hạn ({expiredVouchers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeVouchers.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Chưa có voucher nào đang hoạt động
              </h3>
              <p className="text-muted-foreground">
                Hãy quay lại sau để nhận các ưu đãi hấp dẫn
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeVouchers.map((voucher) => (
                <VoucherCard key={voucher.id} voucher={voucher} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingVouchers.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Chưa có voucher sắp diễn ra
              </h3>
              <p className="text-muted-foreground">
                Các voucher mới sẽ được cập nhật sớm
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingVouchers.map((voucher) => (
                <VoucherCard key={voucher.id} voucher={voucher} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredVouchers.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Không có voucher đã hết hạn
              </h3>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {expiredVouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  showCopyButton={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
