import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronUp, FileText, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { useBusinessProfile } from '@/features/business/api'
import { useMyQuotations } from '@/features/quotations/api'
import { ConvertQuotationDialog } from '@/features/quotations/ConvertQuotationDialog'
import { QuotationItemsList } from '@/features/quotations/QuotationItemsList'
import {
  canConvertQuotation,
  getQuotationStatusLabel,
  isQuotationExpired,
} from '@/features/quotations/quotation-utils'
import { openQuotationPrint } from '@/features/quotations/quotation-print'
import { QUOTATION_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Quotation } from '@/types'

function QuotationCard({
  quotation,
  business,
  onConvert,
}: {
  quotation: Quotation
  business: ReturnType<typeof useBusinessProfile>['data']
  onConvert: (quotation: Quotation) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const expired = isQuotationExpired(quotation)
  const convertible = canConvertQuotation(quotation)
  const statusLabel = getQuotationStatusLabel(quotation, QUOTATION_STATUS_LABELS)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{quotation.code}</span>
            <Badge variant={expired ? 'destructive' : 'secondary'}>{statusLabel}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">HSD: {formatDate(quotation.validUntil)}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>{quotation.items.length} mặt hàng · {formatCurrency(quotation.total)}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? 'Thu gọn' : 'Chi tiết'}
          </Button>
        </div>

        {expanded ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <QuotationItemsList items={quotation.items} />
            {quotation.note ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Ghi chú:</span> {quotation.note}
              </p>
            ) : null}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chiết khấu</span>
                  <span>−{formatCurrency(quotation.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-semibold">
                <span>Tổng</span>
                <span className="text-primary">{formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openQuotationPrint(quotation, { business: business?.profile })}
          >
            In/PDF báo giá
          </Button>
          {convertible ? (
            <Button size="sm" onClick={() => onConvert(quotation)}>
              Chuyển thành đơn hàng
            </Button>
          ) : null}
          {quotation.status === 'sent' && !expired ? (
            <span className="self-center text-xs text-muted-foreground">Đang chờ admin duyệt</span>
          ) : null}
          {quotation.convertedOrderId ? (
            <Button asChild size="sm" variant="ghost">
              <Link to="/orders">Xem đơn {quotation.convertedOrderId}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function QuotationsPage() {
  const { data: business } = useBusinessProfile()
  const { data: quotations = [], isLoading } = useMyQuotations()
  const [convertTarget, setConvertTarget] = useState<Quotation | null>(null)

  if (!business?.profile || business.profile.status !== 'approved') {
    return (
      <PageContainer>
        <EmptyState
          icon={FileText}
          title="Báo giá B2B"
          description="Bạn cần đăng ký và được duyệt tài khoản doanh nghiệp để tạo báo giá."
          action={<Button asChild><Link to="/account">Đăng ký doanh nghiệp</Link></Button>}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Báo giá của tôi</h1>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/cart"><ShoppingCart className="size-4" /> Tạo từ giỏ hàng</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : quotations.length === 0 ? (
        <EmptyState icon={FileText} title="Chưa có báo giá" description="Thêm sản phẩm vào giỏ và tạo báo giá từ trang giỏ hàng." />
      ) : (
        quotations.map((q) => (
          <QuotationCard
            key={q.id}
            quotation={q}
            business={business}
            onConvert={setConvertTarget}
          />
        ))
      )}

      <ConvertQuotationDialog
        quotation={convertTarget}
        onOpenChange={(open) => {
          if (!open) setConvertTarget(null)
        }}
      />
    </PageContainer>
  )
}