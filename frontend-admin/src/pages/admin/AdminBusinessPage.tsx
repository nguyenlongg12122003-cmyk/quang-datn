import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useAdminBusinessProfiles, useReviewBusinessProfile } from '@/features/business/api'
import { BUSINESS_STATUS_LABELS, BUSINESS_TYPE_LABELS, CUSTOMER_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { useDebounce } from '@/hooks/use-debounce'
import type { AdminBusinessProfile } from '@/lib/api/endpoints/business'
import type { CustomerType } from '@/types'

export function AdminBusinessPage() {
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const q = useDebounce(search, 300)
  const { data: profiles = [], isLoading } = useAdminBusinessProfiles({ status, q: q || undefined })
  const review = useReviewBusinessProfile()

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Khách hàng doanh nghiệp" description="Duyệt hồ sơ B2B, cấp hạn mức công nợ và nhóm giá." />

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên công ty, MST, email..."
        filters={(
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        activeFilterCount={status !== 'pending' ? 1 : 0}
        hasActiveFilters={status !== 'pending'}
        onClearFilters={() => setStatus('pending')}
      />

      <AdminDataPanel>
        {isLoading ? <p className="p-4 text-sm text-muted-foreground">Đang tải...</p> : null}
        {!isLoading && profiles.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Không có hồ sơ doanh nghiệp.</p>
        ) : null}
        <div className="space-y-4 p-4">
          {profiles.map((p) => (
            <BusinessReviewCard
              key={p.userId}
              profile={p}
              onReview={(payload) => {
                review.mutate(
                  { userId: p.userId, ...payload },
                  {
                    onSuccess: (res) => toast.success(res.message),
                    onError: (err) => toast.error(getErrorMessage(err)),
                  },
                )
              }}
            />
          ))}
        </div>
      </AdminDataPanel>
    </div>
  )
}

function BusinessReviewCard({
  profile,
  onReview,
}: {
  profile: AdminBusinessProfile
  onReview: (payload: {
    status: 'approved' | 'rejected'
    customerType?: CustomerType
    creditLimit?: number
    paymentTermDays?: number
    note?: string
  }) => void
}) {
  const [creditLimit, setCreditLimit] = useState(String(profile.creditLimit || 50000000))
  const [paymentTermDays, setPaymentTermDays] = useState(String(profile.paymentTermDays || 30))
  const [customerType, setCustomerType] = useState<CustomerType>(profile.customerType ?? 'wholesale')
  const [note, setNote] = useState('')

  const handleApprove = () => {
    const limit = Number(creditLimit)
    const termDays = Number(paymentTermDays)
    if (!Number.isFinite(limit) || limit < 0) {
      toast.error('Hạn mức công nợ không hợp lệ')
      return
    }
    if (!Number.isFinite(termDays) || termDays < 0) {
      toast.error('Hạn thanh toán không hợp lệ')
      return
    }
    onReview({
      status: 'approved',
      customerType,
      creditLimit: limit,
      paymentTermDays: termDays,
      note: note.trim() || undefined,
    })
  }

  const handleReject = () => {
    if (!note.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }
    onReview({ status: 'rejected', note: note.trim() })
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold">{profile.companyName}</h3>
          <p className="text-sm text-muted-foreground">{profile.userName} · {profile.email}</p>
          <p className="text-sm">
            MST: {profile.taxCode || '—'} · {BUSINESS_TYPE_LABELS[profile.businessType]}
          </p>
          <p className="text-sm">Liên hệ: {profile.contactPerson}</p>
          <p className="text-sm text-muted-foreground">
            SĐT: {profile.contactPhone || profile.userPhone || '—'}
            {profile.contactEmail ? ` · ${profile.contactEmail}` : ''}
          </p>
          {profile.invoiceAddress ? (
            <p className="text-sm text-muted-foreground">Địa chỉ HĐ VAT: {profile.invoiceAddress}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">Đăng ký: {formatDate(profile.createdAt)}</p>
        </div>
        <Badge variant={profile.status === 'approved' ? 'default' : 'secondary'}>
          {BUSINESS_STATUS_LABELS[profile.status]}
        </Badge>
      </div>

      {profile.status === 'pending' ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Nhóm giá</Label>
              <Select value={customerType} onValueChange={(v) => setCustomerType(v as CustomerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wholesale">{CUSTOMER_TYPE_LABELS.wholesale}</SelectItem>
                  <SelectItem value="enterprise">{CUSTOMER_TYPE_LABELS.enterprise}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Hạn mức công nợ</Label>
              <Input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hạn thanh toán (ngày)</Label>
              <Input value={paymentTermDays} onChange={(e) => setPaymentTermDays(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Ghi chú (bắt buộc khi từ chối)</Label>
            <Textarea
              placeholder="Ghi chú duyệt hoặc lý do từ chối..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApprove}>Duyệt</Button>
            <Button variant="outline" onClick={handleReject}>Từ chối</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>
            Hạn mức {formatCurrency(profile.creditLimit)} · {profile.paymentTermDays} ngày
          </p>
          {profile.customerType && profile.customerType !== 'retail' ? (
            <p>Nhóm giá: {CUSTOMER_TYPE_LABELS[profile.customerType]}</p>
          ) : null}
          {profile.note ? <p>Ghi chú: {profile.note}</p> : null}
        </div>
      )}
    </div>
  )
}