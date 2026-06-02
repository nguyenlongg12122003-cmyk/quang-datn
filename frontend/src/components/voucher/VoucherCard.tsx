import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Calendar, ShoppingCart, Copy, Check } from 'lucide-react';
import { type Voucher } from '@/lib/api-service';
import { useState } from 'react';
import { toast } from 'sonner';

interface VoucherCardProps {
  voucher: Voucher;
  onCopy?: (code: string) => void;
  showCopyButton?: boolean;
}

export function VoucherCard({ voucher, onCopy, showCopyButton = true }: VoucherCardProps) {
  const [copied, setCopied] = useState(false);

  const isExpired = new Date(voucher.endDate) < new Date();
  const isNotStarted = new Date(voucher.startDate) > new Date();
  const isActive = voucher.status === 'active' && !isExpired && !isNotStarted;
  const usagePercent = (voucher.usedCount / voucher.usageLimit) * 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    toast.success('Đã sao chép mã giảm giá');
    onCopy?.(voucher.code);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDiscountText = () => {
    if (voucher.type === 'percentage') {
      return `Giảm ${voucher.value}%`;
    }
    return `Giảm ${voucher.value.toLocaleString('vi-VN')}₫`;
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="secondary">Đã hết hạn</Badge>;
    }
    if (isNotStarted) {
      return <Badge variant="secondary">Chưa bắt đầu</Badge>;
    }
    if (voucher.usedCount >= voucher.usageLimit) {
      return <Badge variant="secondary">Đã hết lượt</Badge>;
    }
    if (isActive) {
      return <Badge className="bg-green-500">Đang hoạt động</Badge>;
    }
    return <Badge variant="secondary">Không khả dụng</Badge>;
  };

  return (
    <Card className={`overflow-hidden ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex">
        {/* Left side - Discount info */}
        <div className="flex-shrink-0 w-32 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 flex flex-col items-center justify-center relative">
          <Ticket className="h-8 w-8 mb-2" />
          <div className="text-2xl font-bold text-center">{getDiscountText()}</div>
          {voucher.maxDiscount && voucher.type === 'percentage' && (
            <div className="text-xs mt-1 text-center opacity-90">
              Tối đa {voucher.maxDiscount.toLocaleString('vi-VN')}₫
            </div>
          )}
          {/* Decorative circles */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full" />
        </div>

        {/* Right side - Details */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{voucher.code}</h3>
                {getStatusBadge()}
              </div>
              {voucher.description && (
                <p className="text-sm text-muted-foreground">{voucher.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Đơn tối thiểu: {voucher.minOrderValue.toLocaleString('vi-VN')}₫</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                HSD: {new Date(voucher.startDate).toLocaleDateString('vi-VN')} -{' '}
                {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Usage progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Đã dùng: {voucher.usedCount}/{voucher.usageLimit}</span>
              <span>{Math.round(usagePercent)}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Copy button */}
          {showCopyButton && isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="w-full"
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Sao chép mã
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
