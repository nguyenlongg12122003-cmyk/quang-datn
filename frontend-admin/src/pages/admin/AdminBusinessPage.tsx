import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AdminActiveFilterChips } from '@/components/admin/AdminActiveFilterChips'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { AdminFilterField } from '@/components/admin/AdminFilterField'
import { AdminFilterSelect } from '@/components/admin/AdminFilterSelect'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BusinessReviewCard } from '@/features/business/BusinessReviewCard'
import { useAdminBusinessProfiles, useReviewBusinessProfile } from '@/features/business/api'
import { BUSINESS_STATUS_LABELS } from '@/lib/constants'
import { getErrorMessage } from '@/lib/api/axios'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import type { BusinessStatus } from '@/types'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
] as const

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value']

function BusinessCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  )
}

export function AdminBusinessPage() {
  const [status, setStatus] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const q = useDebounce(search, 300)

  const listQuery = { status, q: q.trim() || undefined }
  const { data: profiles = [], isLoading, isFetching, refetch } = useAdminBusinessProfiles(listQuery)
  const { data: allProfiles = [] } = useAdminBusinessProfiles({ status: 'all' })
  const review = useReviewBusinessProfile()

  const counts = useMemo(
    () => ({
      all: allProfiles.length,
      pending: allProfiles.filter((p) => p.status === 'pending').length,
      approved: allProfiles.filter((p) => p.status === 'approved').length,
      rejected: allProfiles.filter((p) => p.status === 'rejected').length,
    }),
    [allProfiles],
  )

  const hasActiveFilters = status !== 'pending' || Boolean(q.trim())

  const filterChips = [
    q.trim()
      ? { key: 'q', label: `Tìm: "${q.trim()}"`, onRemove: () => setSearch('') }
      : null,
    status !== 'pending'
      ? {
          key: 'status',
          label: BUSINESS_STATUS_LABELS[status as BusinessStatus] ?? status,
          onRemove: () => setStatus('pending'),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>

  const resetFilters = () => {
    setStatus('pending')
    setSearch('')
  }

  const summaryCards = [
    {
      key: 'pending' as const,
      label: 'Chờ duyệt',
      value: counts.pending,
      icon: Clock,
      accent: 'bg-amber-500/10 text-amber-600',
      ring: status === 'pending' ? 'ring-2 ring-amber-500/40' : '',
    },
    {
      key: 'approved' as const,
      label: 'Đã duyệt',
      value: counts.approved,
      icon: CheckCircle2,
      accent: 'bg-emerald-500/10 text-emerald-600',
      ring: status === 'approved' ? 'ring-2 ring-emerald-500/40' : '',
    },
    {
      key: 'rejected' as const,
      label: 'Từ chối',
      value: counts.rejected,
      icon: XCircle,
      accent: 'bg-rose-500/10 text-rose-600',
      ring: status === 'rejected' ? 'ring-2 ring-rose-500/40' : '',
    },
    {
      key: 'all' as const,
      label: 'Tổng hồ sơ',
      value: counts.all,
      icon: Building2,
      accent: 'bg-primary/10 text-primary',
      ring: status === 'all' ? 'ring-2 ring-primary/30' : '',
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Khách hàng doanh nghiệp"
        description="Duyệt hồ sơ B2B, xác minh giấy tờ, cấp hạn mức công nợ và nhóm giá."
      />

      {/* Summary — click to filter */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setStatus(card.key)}
            className="text-left"
          >
            <Card className={card.ring}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <span className={cn('grid size-11 place-items-center rounded-xl', card.accent)}>
                  <card.icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên công ty, MST, email..."
        onRefresh={() => refetch()}
        isRefreshing={isFetching && !isLoading}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        activeFilterCount={filterChips.length}
        filters={(
          <AdminFilterField label="Trạng thái">
            <AdminFilterSelect
              value={status}
              onValueChange={(v) => setStatus(v as StatusFilter)}
              options={[...STATUS_OPTIONS]}
            />
          </AdminFilterField>
        )}
        footer={(
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={status === option.value ? 'default' : 'outline'}
                className="h-8 gap-1.5"
                onClick={() => setStatus(option.value)}
              >
                {option.label}
                <Badge
                  variant={status === option.value ? 'secondary' : 'outline'}
                  className="h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                >
                  {counts[option.value]}
                </Badge>
              </Button>
            ))}
          </div>
        )}
      />

      {filterChips.length > 0 ? (
        <AdminActiveFilterChips chips={filterChips} onClearAll={resetFilters} />
      ) : null}

      <AdminDataPanel>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">
            {isLoading ? 'Đang tải...' : `${profiles.length} hồ sơ`}
            {q.trim() ? ` khớp "${q.trim()}"` : ''}
          </p>
          {status === 'pending' && counts.pending > 0 ? (
            <Badge className="bg-amber-500 hover:bg-amber-500">
              {counts.pending} cần xử lý
            </Badge>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <BusinessCardSkeleton key={i} />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Building2}
              title="Không có hồ sơ doanh nghiệp"
              description={
                hasActiveFilters
                  ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
                  : 'Chưa có đăng ký doanh nghiệp nào trong hệ thống.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {profiles.map((profile) => (
              <BusinessReviewCard
                key={profile.userId}
                profile={profile}
                isReviewing={review.isPending}
                onReview={(payload) => {
                  review.mutate(
                    { userId: profile.userId, ...payload },
                    {
                      onSuccess: (res) => toast.success(res.message),
                      onError: (err) => toast.error(getErrorMessage(err)),
                    },
                  )
                }}
              />
            ))}
          </div>
        )}
      </AdminDataPanel>
    </div>
  )
}