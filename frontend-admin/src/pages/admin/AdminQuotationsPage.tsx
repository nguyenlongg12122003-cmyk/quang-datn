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
import { useAdminQuotations, useCancelQuotation, useUpdateQuotation, useUpdateQuotationStatus } from '@/features/quotations/api'
import { canCancelQuotation, getQuotationStatusLabel, isQuotationExpired } from '@/features/quotations/quotation-utils'
import { openQuotationPrint } from '@/features/quotations/quotation-print'
import { useDebounce } from '@/hooks/use-debounce'
import { QUOTATION_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { Quotation } from '@/types'

function QuotationAdminCard({ quotation }: { quotation: Quotation }) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editDiscount, setEditDiscount] = useState(String(quotation.discount || 0))
  const [editValidUntil, setEditValidUntil] = useState(quotation.validUntil ? new Date(quotation.validUntil).toISOString().slice(0, 16) : '')
  const [editNote, setEditNote] = useState(quotation.note || '')
  // Per-item unitPrice edits (keyed by quotation_items.id). Only changed or all values are sent as overrides.
  const [itemEdits, setItemEdits] = useState<Record<number, string>>({})
  const updateStatus = useUpdateQuotationStatus()
  const updateQuotation = useUpdateQuotation()
  const expired = isQuotationExpired(quotation)
  const statusLabel = getQuotationStatusLabel(quotation, QUOTATION_STATUS_LABELS)
  const editable = !expired && ['sent', 'draft'].includes(quotation.status)

  const mutateStatus = (status: Quotation['status']) => {
    updateStatus.mutate(
      { id: quotation.id, status },
      {
        onSuccess: () => toast.success('Đã cập nhật trạng thái báo giá'),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const handleSaveEdit = () => {
    const patch: any = {}
    const d = Number(editDiscount)
    if (Number.isFinite(d) && d >= 0) patch.discount = d
    if (editValidUntil) patch.validUntil = new Date(editValidUntil).toISOString()
    patch.note = editNote.trim() || null

    // Build itemPriceOverrides only for items that have an edit value
    const overrides: Record<number, { unitPrice: number }> = {}
    Object.entries(itemEdits).forEach(([key, val]) => {
      const num = Number(val)
      const itemId = Number(key)
      if (Number.isFinite(num) && num >= 0 && quotation.items.some((it) => it.id === itemId)) {
        overrides[itemId] = { unitPrice: num }
      }
    })
    if (Object.keys(overrides).length > 0) {
      patch.itemPriceOverrides = overrides
    }

    updateQuotation.mutate(
      { id: quotation.id, ...patch },
      {
        onSuccess: () => {
          toast.success('Đã lưu chỉnh sửa báo giá (giá dòng đã cập nhật)')
          setIsEditing(false)
          setItemEdits({})
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const startEdit = () => {
    setEditDiscount(String(quotation.discount || 0))
    setEditValidUntil(quotation.validUntil ? new Date(quotation.validUntil).toISOString().slice(0, 16) : '')
    setEditNote(quotation.note || '')

    // Initialize item edits from current snapshot
    const initial: Record<number, string> = {}
    quotation.items.forEach((it) => {
      if (it.id != null) initial[it.id] = String(it.unitPrice)
    })
    setItemEdits(initial)

    setIsEditing(true)
    if (!expanded) setExpanded(true)
  }

  const updateItemEdit = (itemId: number, value: string) => {
    setItemEdits((prev) => ({ ...prev, [itemId]: value }))
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

      {isEditing ? (
        <div className="mt-3 space-y-3 rounded-lg border bg-muted/10 p-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Chiết khấu (VNĐ)</Label>
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={editDiscount}
                onChange={(e) => setEditDiscount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Hiệu lực đến</Label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={editValidUntil}
                onChange={(e) => setEditValidUntil(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Ghi chú (admin)</Label>
            <textarea
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </div>

          {/* Per-item price editing for true B2B negotiation */}
          <div>
            <Label className="text-xs font-medium">Chỉnh giá từng dòng (tùy chọn)</Label>
            <div className="mt-2 space-y-2">
              {quotation.items.map((item, idx) => {
                const itemId = item.id ?? idx
                const currentVal = itemEdits[itemId] ?? String(item.unitPrice)
                return (
                  <div key={itemId} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 min-w-0 truncate">
                      {item.productName} ×{item.quantity}
                      {item.packagingUnit ? ` (${item.packagingQty} ${item.packagingUnit})` : ''}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className="w-28 rounded border px-2 py-1 text-right text-sm font-mono"
                      value={currentVal}
                      onChange={(e) => updateItemEdit(itemId, e.target.value)}
                    />
                    <span className="w-20 text-right text-muted-foreground">/ {formatCurrency(item.unitPrice * item.quantity)}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Giá dòng mới sẽ được dùng để tính lại tạm tính + tổng khi lưu.</p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={updateQuotation.isPending}>Lưu chỉnh sửa</Button>
            <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setItemEdits({}); }}>Hủy chỉnh</Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Lưu sẽ tính lại tổng từ các mục (có thể đã chỉnh giá dòng) + chiết khấu.</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openQuotationPrint(quotation)}>
          In báo giá
        </Button>
        {editable && !isEditing ? (
          <Button size="sm" variant="outline" onClick={startEdit}>Chỉnh sửa</Button>
        ) : null}
        {quotation.status === 'sent' && !expired && !isEditing ? (
          <>
            <Button size="sm" onClick={() => mutateStatus('accepted')}>Chấp nhận</Button>
            <Button size="sm" variant="outline" onClick={() => mutateStatus('rejected')}>Từ chối</Button>
          </>
        ) : null}
        {['sent', 'accepted'].includes(quotation.status) && !expired && !isEditing ? (
          <Button size="sm" variant="outline" onClick={() => mutateStatus('expired')}>
            Đánh dấu hết hạn
          </Button>
        ) : null}
        {quotation.convertedOrderId ? (
          <Button asChild size="sm" variant="ghost">
            <Link to={`/orders/${quotation.convertedOrderId}`}>Xem đơn {quotation.convertedOrderId}</Link>
          </Button>
        ) : null}
        {canCancelQuotation(quotation) && !isEditing ? (
          <Button size="sm" variant="ghost" onClick={() => mutateStatus('cancelled')}>
            Hủy
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