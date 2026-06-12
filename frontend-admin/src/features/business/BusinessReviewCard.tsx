import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMstLookup } from '@/features/business/api'
import {
  BUSINESS_STATUS_LABELS,
  BUSINESS_TYPE_LABELS,
  CUSTOMER_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  REVIEW_ACTION_LABELS,
} from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { cn } from '@/lib/utils'
import type { AdminBusinessProfile } from '@/lib/api/endpoints/business'
import type { CustomerType } from '@/types'

interface MstLookupResult {
  valid: boolean
  taxCode?: string
  companyName?: string
  address?: string
  legalStatus?: string
  message?: string
  note?: string
}

const STATUS_STYLES = {
  pending: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    icon: ClockIcon,
  },
  approved: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    icon: CheckCircle2,
  },
  rejected: {
    border: 'border-l-rose-500',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
    icon: XCircle,
  },
} as const

function ClockIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words">{value}</p>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3', accent)}>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

export function BusinessReviewCard({
  profile,
  onReview,
  isReviewing,
}: {
  profile: AdminBusinessProfile
  onReview: (payload: {
    status: 'approved' | 'rejected'
    customerType?: CustomerType
    creditLimit?: number
    paymentTermDays?: number
    note?: string
  }) => void
  isReviewing?: boolean
}) {
  const navigate = useNavigate()
  const mstLookup = useMstLookup()
  const style = STATUS_STYLES[profile.status]
  const StatusIcon = style.icon

  const [expanded, setExpanded] = useState(profile.status === 'pending')
  const [creditLimit, setCreditLimit] = useState(String(profile.creditLimit || 50_000_000))
  const [paymentTermDays, setPaymentTermDays] = useState(String(profile.paymentTermDays || 30))
  const [customerType, setCustomerType] = useState<CustomerType>(profile.customerType ?? 'wholesale')
  const [note, setNote] = useState('')
  const [mstResult, setMstResult] = useState<MstLookupResult | null>(null)

  const stats = profile.stats ?? {
    orderCount: 0,
    totalSpent: 0,
    lastOrderAt: null,
    creditOrderCount: 0,
    creditTotal: 0,
  }

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

  const runMstLookup = async () => {
    if (!profile.taxCode) {
      toast.error('Hồ sơ chưa có MST để tra cứu')
      return
    }
    try {
      const res = (await mstLookup.mutateAsync(profile.taxCode)) as MstLookupResult
      setMstResult(res)
      if (res.valid) toast.success('Tra cứu MST thành công')
      else toast.info(res.message || 'Không tìm thấy')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const mstNameMatch =
    mstResult?.valid &&
    mstResult.companyName &&
    profile.companyName.toLowerCase().includes(mstResult.companyName.toLowerCase().slice(0, 8))

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md',
        style.border,
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold leading-tight">{profile.companyName}</h3>
              <Badge variant="outline" className="font-normal">
                {BUSINESS_TYPE_LABELS[profile.businessType]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.userName} · {profile.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Đăng ký {formatDate(profile.createdAt)}
              {stats.lastOrderAt ? ` · Đơn gần nhất ${formatDate(stats.lastOrderAt)}` : ''}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn('gap-1 border', style.badge)}>
          <StatusIcon className="size-3" />
          {BUSINESS_STATUS_LABELS[profile.status]}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid gap-2 px-4 pb-3 sm:grid-cols-3">
        <StatTile
          icon={ShoppingBag}
          label="Tổng đơn hàng"
          value={`${stats.orderCount} đơn · ${formatCurrency(stats.totalSpent)}`}
        />
        <StatTile
          icon={CreditCard}
          label="Công nợ"
          value={
            stats.creditOrderCount > 0
              ? `${stats.creditOrderCount} đơn · ${formatCurrency(stats.creditTotal)}`
              : 'Chưa có'
          }
          accent={stats.creditOrderCount > 0 ? 'border-amber-200/80 bg-amber-50/50' : undefined}
        />
        <div className="flex items-stretch">
          <Button
            variant="outline"
            size="sm"
            className="h-full w-full justify-start gap-2 text-left"
            onClick={() => navigate(`/orders?q=${encodeURIComponent(profile.email)}`)}
          >
            <ExternalLink className="size-3.5 shrink-0" />
            <span className="text-xs">Xem lịch sử đơn hàng</span>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Collapsible details */}
      <div className="p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left text-sm font-medium"
          onClick={() => setExpanded((v) => !v)}
        >
          <span>Thông tin hồ sơ & giấy tờ</span>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {expanded ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Liên hệ & hóa đơn
              </p>
              <InfoRow icon={User} label="Người liên hệ" value={profile.contactPerson} />
              <InfoRow
                icon={Phone}
                label="Điện thoại"
                value={profile.contactPhone || profile.userPhone || '—'}
              />
              {profile.contactEmail ? (
                <InfoRow icon={Mail} label="Email liên hệ" value={profile.contactEmail} />
              ) : null}
              {profile.invoiceAddress ? (
                <InfoRow icon={MapPin} label="Địa chỉ xuất HĐ VAT" value={profile.invoiceAddress} />
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Mã số thuế
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={runMstLookup}
                  disabled={mstLookup.isPending || !profile.taxCode}
                >
                  <Search className="size-3" />
                  Tra cứu
                </Button>
              </div>
              <p className="font-mono text-sm">{profile.taxCode || '—'}</p>

              {mstResult ? (
                <div
                  className={cn(
                    'rounded-md border p-2.5 text-xs',
                    mstResult.valid
                      ? mstNameMatch
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900',
                  )}
                >
                  {mstResult.valid ? (
                    <>
                      <p className="font-medium">{mstResult.companyName}</p>
                      <p className="mt-0.5 opacity-80">{mstResult.address}</p>
                      <p className="mt-1">
                        Trạng thái pháp lý: {mstResult.legalStatus || '—'}
                        {!mstNameMatch ? ' · Tên công ty khác với hồ sơ — cần kiểm tra' : ' · Khớp tên'}
                      </p>
                    </>
                  ) : (
                    <p>{mstResult.message}</p>
                  )}
                </div>
              ) : null}
            </div>

            {profile.documents && profile.documents.length > 0 ? (
              <div className="space-y-2 lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Giấy tờ đính kèm ({profile.documents.length})
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {profile.documents.map((doc, i) => (
                    <a
                      key={i}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border bg-background p-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <FileText className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.name || 'Tài liệu'}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[doc.type] || doc.type} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground lg:col-span-2">
                Chưa có giấy tờ đính kèm.
              </p>
            )}

            {profile.reviewHistory && profile.reviewHistory.length > 0 ? (
              <div className="space-y-2 lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lịch sử duyệt
                </p>
                <ol className="relative space-y-0 border-l border-border pl-4">
                  {[...profile.reviewHistory].reverse().slice(0, 6).map((ev, i) => (
                    <li key={i} className="relative pb-3 last:pb-0">
                      <span className="absolute -left-[calc(0.5rem+1px)] top-1.5 size-2 rounded-full bg-primary" />
                      <p className="text-sm font-medium">
                        {REVIEW_ACTION_LABELS[ev.action] || ev.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(ev.performedAt)}
                        {ev.note ? ` — ${ev.note}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Review / status summary */}
      {profile.status === 'pending' ? (
        <div className="border-t bg-amber-50/40 p-4 dark:bg-amber-950/20">
          <p className="mb-3 text-sm font-medium">Duyệt hồ sơ doanh nghiệp</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Nhóm giá</Label>
              <Select value={customerType} onValueChange={(v) => setCustomerType(v as CustomerType)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wholesale">{CUSTOMER_TYPE_LABELS.wholesale}</SelectItem>
                  <SelectItem value="enterprise">{CUSTOMER_TYPE_LABELS.enterprise}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Hạn mức công nợ (VNĐ)</Label>
              <Input
                className="bg-background"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Hạn thanh toán (ngày)</Label>
              <Input
                className="bg-background"
                value={paymentTermDays}
                onChange={(e) => setPaymentTermDays(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Label>Ghi chú (bắt buộc khi từ chối)</Label>
            <Textarea
              className="bg-background"
              placeholder="Ghi chú duyệt hoặc lý do từ chối..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={handleApprove} disabled={isReviewing} className="gap-1.5">
              <CheckCircle2 className="size-4" />
              Duyệt hồ sơ
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isReviewing}
              className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <XCircle className="size-4" />
              Từ chối
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t bg-muted/20 px-4 py-3 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>
              Hạn mức <strong className="text-foreground">{formatCurrency(profile.creditLimit)}</strong>
            </span>
            <span>
              Thanh toán <strong className="text-foreground">{profile.paymentTermDays} ngày</strong>
            </span>
            {profile.customerType && profile.customerType !== 'retail' ? (
              <span>
                Nhóm giá{' '}
                <strong className="text-foreground">
                  {CUSTOMER_TYPE_LABELS[profile.customerType]}
                </strong>
              </span>
            ) : null}
            {profile.note ? (
              <span className="w-full text-xs">
                Ghi chú: <span className="text-foreground">{profile.note}</span>
              </span>
            ) : null}
          </div>
        </div>
      )}
    </article>
  )
}