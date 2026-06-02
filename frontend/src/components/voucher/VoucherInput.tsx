import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ticket, X, Loader2, CheckCircle2 } from 'lucide-react';
import { voucherApi, type Voucher } from '@/lib/api-service';

interface VoucherInputProps {
  subtotal: number;
  onApply: (voucher: Voucher, discount: number) => void;
  onRemove: () => void;
  appliedVoucher?: { code: string; discount: number } | null;
}

export function VoucherInput({ subtotal, onApply, onRemove, appliedVoucher }: VoucherInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Vui lòng nhập mã giảm giá');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await voucherApi.validate(code.trim().toUpperCase(), subtotal);

      if (result.valid && result.voucher) {
        onApply(result.voucher, result.discount);
        setCode('');
        setError('');
      } else {
        setError('Mã giảm giá không hợp lệ');
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        setError(response?.data?.message || 'Mã giảm giá không hợp lệ');
      } else {
        setError('Có lỗi xảy ra, vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  if (appliedVoucher) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-900">{appliedVoucher.code}</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  -{appliedVoucher.discount.toLocaleString('vi-VN')} ₫
                </Badge>
              </div>
              <p className="text-sm text-green-700">Mã giảm giá đã được áp dụng</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-green-700 hover:text-green-900 hover:bg-green-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nhập mã giảm giá"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyPress={handleKeyPress}
            className="pl-10 uppercase"
            disabled={loading}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="min-w-[100px]"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Đang kiểm tra
            </>
          ) : (
            'Áp dụng'
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
