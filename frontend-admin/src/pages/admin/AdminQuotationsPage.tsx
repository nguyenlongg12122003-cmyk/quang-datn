import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { QuotationItemsList } from '@/features/quotations/QuotationItemsList'
import { useAdminQuotations, useUpdateQuotationStatus } from '@/features/quotations/api'
import { getQuotationStatusLabel, isQuotationExpired } from '@/features/quotations/quotation-utils'
import { openQuotationPrint } from '@/features/quotations/quotation-print'
import { useDebounce } from '@/hooks/use-debounce'
import { QUOTATION_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { Quotation } from '@/types'

function QuotationAdminCard({ quotation }: { quotation: Quotation }) {
  const [expanded, setExpanded] = useState(false)
  const updateStatus = useUpdateQuotationStatus()
  const expired = isQuotationExpired(quotation)
  const statusLabel = getQuotationStatusLabel(quotation, QUOTATION_STATUS_LABELS)

  const mutateStatus = (status: Quotation['status']) => {
    updateStatus.mutate(
      { id: quotation.id, status },
      {
        onSuccess: () => toast.success('Đã cập nhật trạng thái báo giá'),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-semibold">{quotation.code}</p>
          <p className="text-sm text-muted-foreground">
            {quotation.userName ?? 'Khách hàng'} · {quotation.userEmail ?? '—'}
          </p>
          <p className="text-sm text-muted-foreground">
            {quotation.items.length} mặt hàng · HSD {formatDate(quotation.validUntil)} · Tạo {formatDateTime(quotation.createdAt)}
          </p>
        </div>
        <Badge variant={expired ? 'destructive' : 'secondary'}>{statusLabel}</Badge>
      </div>

      <p className="mt-2 font-medium text-primary">{formatCurrency(quotation.total)}</p>

      <div className="mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-0"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
        </Button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 rounded-lg border bg-muted/20 p-3">
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
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openQuotationPrint(quotation)}>
          In báo giá
        </Button>
        {quotation.status === 'sent' && !expired ? (
          <>
            <Button size="sm" onClick={() => mutateStatus('accepted')}>Chấp nhận</Button>
            <Button size="sm" variant="outline" onClick={() => mutateStatus('rejected')}>Từ chối</Button>
          </>
        ) : null}
        {['sent', 'accepted'].includes(quotation.status) && !expired ? (
          <Button size="sm" variant="outline" onClick={() => mutateStatus('expired')}>
            Đánh dấu hết hạn
          </Button>
        ) : null}
        {quotation.convertedOrderId ? (
          <Button asChild size="sm" variant="ghost">
            <Link to={`/orders/${quotation.convertedOrderId}`}>Xem đơn {quotation.convertedOrderId}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function AdminQuotationsPage() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const q = useDebounce(search, 300)
  const { data: quotations = [], isLoading, refetch, isFetching } = useAdminQuotations({
    status: status === 'all' ? undefined : status,
    q: q || undefined,
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Báo giá B2B" description="Theo dõi và duyệt báo giá từ khách doanh nghiệp." />

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo mã, tên hoặc email khách..."
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        filters={(
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {Object.entries(QUOTATION_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        activeFilterCount={status !== 'all' ? 1 : 0}
        hasActiveFilters={status !== 'all'}
        onClearFilters={() => setStatus('all')}
      />

      <AdminDataPanel>
        {isLoading ? <p className="p-4 text-sm text-muted-foreground">Đang tải...</p> : null}
        {!isLoading && quotations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có báo giá.</p>
        ) : null}
        <div className="space-y-3 p-4">
          {quotations.map((q) => (
            <QuotationAdminCard key={q.id} quotation={q} />
          ))}
        </div>
      </AdminDataPanel>
    </div>
  )
}