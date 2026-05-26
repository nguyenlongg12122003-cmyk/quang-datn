import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CheckCircle, Clock3, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';

export function PaymentPayOSReturnPage() {
  const location = useLocation();
  const clearCart = useCartStore((s) => s.clearCart);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('Đang xác thực kết quả thanh toán PayOS...');

  const queryObject = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const result = {} as Record<string, string>;
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        const { data, status } = await api.get('/orders/payos-verify', { params: queryObject, validateStatus: () => true });
        if (cancelled) return;

        setOrderId(String(data?.orderId || (queryObject.orderCode ? `ORD-${String(queryObject.orderCode).padStart(8, '0')}` : '')));

        if (status === 200 && data?.success) {
          setSuccess(true);
          setPending(false);
          setMessage('Thanh toán PayOS thành công!');
          clearCart();
          return;
        }

        if (status === 202 && data?.pending) {
          setSuccess(false);
          setPending(true);
          setMessage('PayOS đã ghi nhận giao dịch, hệ thống đang chờ xác nhận thanh toán.');
          return;
        }

        setSuccess(false);
        setPending(false);
        setMessage('Thanh toán chưa thành công hoặc đã bị hủy.');
      } catch {
        if (cancelled) return;
        setSuccess(false);
        setPending(false);
        setMessage('Không thể kiểm tra trạng thái thanh toán PayOS lúc này.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [clearCart, queryObject]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Đang xử lý thanh toán</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-lg">
      {success ? (
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
      ) : pending ? (
        <Clock3 className="h-20 w-20 text-amber-500 mx-auto mb-4" />
      ) : (
        <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
      )}
      <h1 className="text-2xl font-bold mb-2">
        {success ? 'Thanh toán thành công' : pending ? 'Đang chờ xác nhận' : 'Thanh toán thất bại'}
      </h1>
      <p className="text-muted-foreground mb-2">{message}</p>
      {orderId ? (
        <p className="text-muted-foreground mb-6">
          Mã đơn hàng: <span className="font-bold text-foreground">{orderId}</span>
        </p>
      ) : null}
      <div className="flex gap-3 justify-center">
        <Link to="/orders"><Button>Xem đơn hàng</Button></Link>
        <Link to="/"><Button variant="outline">Về trang chủ</Button></Link>
      </div>
    </div>
  );
}
