import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Pencil, Plus, Ticket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminActiveFilterChips } from '@/components/admin/AdminActiveFilterChips'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { AdminFilterField } from '@/components/admin/AdminFilterField'
import { AdminFilterSelect } from '@/components/admin/AdminFilterSelect'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { VoucherFormDialog } from '@/features/admin/VoucherFormDialog'
import { useAdminVouchers } from '@/features/vouchers/api'
import { useDeleteVoucher } from '@/features/admin/api'
import { useAdminListRefetch } from '@/hooks/use-admin-list-refetch'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { VoucherSort } from '@/lib/api/endpoints/vouchers'
import { getEffectiveVoucherStatus } from '@/lib/voucher'
import type { Voucher, VoucherStatus, VoucherType } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: Array<{ value: VoucherStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Tạm tắt' },
  { value: 'expired', label: 'Hết hạn' },
]

const TYPE_OPTIONS: Array<{ value: VoucherType | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'fixed', label: 'Giảm cố định' },
  { value: 'percentage', label: 'Giảm %' },
]

const SORT_OPTIONS: Array<{ value: VoucherSort; label: string }> = [
  { value: 'newest', label: 'Mới tạo' },
  { value: 'ending_soon', label: 'Sắp hết hạn' },
  { value: 'usage_desc', label: 'Dùng nhiều nhất' },
  { value: 'code_asc', label: 'Mã A → Z' },
]

const STATUS_LABELS: Record<VoucherStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Tạm tắt',
  expired: 'Hết hạn',
}

const STATUS_BADGE_CLASS: Record<VoucherStatus, string> = {
  active: 'border-green-200 bg-green-50 text-green-800',
  inactive: 'border-slate-200 bg-slate-50 text-slate-700',
  expired: 'border-red-200 bg-red-50 text-red-800',
}

function parseStatus(value: string | null): VoucherStatus | 'all' {
  if (value === 'active' || value === 'inactive' || value === 'expired') return value
  return 'all'
}

function parseType(value: string | null): VoucherType | 'all' {
  if (value === 'fixed' || value === 'percentage') return value
  return 'all'
}

function parseSort(value: string | null): VoucherSort {
  if (value === 'ending_soon' || value === 'usage_desc' || value === 'code_asc') return value
  return 'newest'
}

function getUsagePercent(voucher: Voucher): number | null {
  if (!voucher.usageLimit) return null
  return Math.round(((voucher.usedCount ?? 0) / voucher.usageLimit) * 100)
}

export function AdminVouchersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const type = parseType(searchParams.get('type'))
  const sort = parseSort(searchParams.get('sort'))
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const q = useDebounce(search, 300)

  const query = useMemo(
    () => ({
      q: q.trim() || undefined,
      status: status === 'all' ? undefined : status,
      type: type === 'all' ? undefined : type,
      sort: sort === 'newest' ? undefined : sort,
    }),
    [q, status, type, sort],
  )

  const { data: vouchers = [], isLoading, refetch } = useAdminVouchers(query)
  const { refresh, isRefreshing } = useAdminListRefetch(refetch)
  const deleteVoucher = useDeleteVoucher()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Voucher | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const updateSearchParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams)
    mutate(params)
    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    updateSearchParams((params) => {
      if (q.trim()) params.set('q', q.trim())
      else params.delete('q')
    })
  }, [q])

  const hasActiveFilters =
    Boolean(q.trim()) || status !== 'all' || type !== 'all' || sort !== 'newest'

  const setFilterParam = (key: string, value: string) => {
    updateSearchParams((params) => {
      if (value === 'all' || (key === 'sort' && value === 'newest')) params.delete(key)
      else params.set(key, value)
    })
  }

  const resetFilters = () => {
    setSearch('')
    updateSearchParams((params) => {
      params.delete('q')
      params.delete('status')
      params.delete('type')
      params.delete('sort')
    })
  }

  const filterChips = [
    q.trim()
      ? { key: 'q', label: `Tìm: "${q.trim()}"`, onRemove: () => setSearch('') }
      : null,
    status !== 'all'
      ? {
          key: 'status',
          label: STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status,
          onRemove: () => setFilterParam('status', 'all'),
        }
      : null,
    type !== 'all'
      ? {
          key: 'type',
          label: TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type,
          onRemove: () => setFilterParam('type', 'all'),
        }
      : null,
    sort !== 'newest'
      ? {
          key: 'sort',
          label: SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort,
          onRemove: () => setFilterParam('sort', 'newest'),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (voucher: Voucher) => {
    setEditing(voucher)
    setOpen(true)
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Voucher"
        description={
          isLoading
            ? 'Đang tải…'
            : `${formatNumber(vouchers.length)} voucher${hasActiveFilters ? ' phù hợp bộ lọc' : ''}`
        }
        action={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="size-4" /> Tạo voucher
          </Button>
        }
      />

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm mã, mô tả…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        activeFilterCount={filterChips.filter((chip) => chip.key !== 'q').length}
        footer={<AdminActiveFilterChips chips={filterChips} onClearAll={hasActiveFilters ? resetFilters : undefined} />}
        filters={
          <>
            <AdminFilterField label="Trạng thái">
              <AdminFilterSelect
                value={status}
                onValueChange={(value) => setFilterParam('status', value)}
                options={STATUS_OPTIONS}
              />
            </AdminFilterField>
            <AdminFilterField label="Loại voucher">
              <AdminFilterSelect
                value={type}
                onValueChange={(value) => setFilterParam('type', value)}
                options={TYPE_OPTIONS}
              />
            </AdminFilterField>
            <AdminFilterField label="Sắp xếp">
              <AdminFilterSelect
                value={sort}
                onValueChange={(value) => setFilterParam('sort', value)}
                options={SORT_OPTIONS}
              />
            </AdminFilterField>
          </>
        }
      />

      {isLoading ? (
        <AdminTableSkeleton rows={5} columns={6} />
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={hasActiveFilters ? 'Không tìm thấy voucher phù hợp' : 'Chưa có voucher'}
          description={
            hasActiveFilters
              ? 'Thử đổi từ khóa hoặc xóa bộ lọc.'
              : 'Tạo voucher để chạy chương trình khuyến mãi.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Tạo voucher
              </Button>
            )
          }
        />
      ) : (
        <>
          <AdminDataPanel className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Mã</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Đơn tối thiểu</TableHead>
                  <TableHead>Đã dùng</TableHead>
                  <TableHead>HSD</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => {
                  const usagePercent = getUsagePercent(voucher)
                  const voucherStatus = getEffectiveVoucherStatus(voucher)

                  return (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <div className="font-medium">{voucher.code}</div>
                        {voucher.description ? (
                          <div className="line-clamp-1 text-xs text-muted-foreground">{voucher.description}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('font-normal', STATUS_BADGE_CLASS[voucherStatus])}
                        >
                          {STATUS_LABELS[voucherStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {voucher.type === 'fixed' ? formatCurrency(voucher.value) : `${voucher.value}%`}
                      </TableCell>
                      <TableCell>{formatCurrency(voucher.minOrderValue)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {voucher.usedCount ?? 0}/{voucher.usageLimit ?? '∞'}
                        </Badge>
                        {usagePercent !== null && usagePercent >= 80 ? (
                          <div className="mt-1 text-xs text-amber-700">Gần hết lượt ({usagePercent}%)</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {voucher.endDate ? formatDate(voucher.endDate) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(voucher)} aria-label="Sửa">
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteId(voucher.id)}
                          aria-label="Xóa"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </AdminDataPanel>

          <div className="space-y-3 md:hidden">
            {vouchers.map((voucher) => {
              const voucherStatus = getEffectiveVoucherStatus(voucher)
              const usagePercent = getUsagePercent(voucher)

              return (
                <AdminDataPanel key={voucher.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{voucher.code}</p>
                      {voucher.description ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{voucher.description}</p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('shrink-0 font-normal', STATUS_BADGE_CLASS[voucherStatus])}
                    >
                      {STATUS_LABELS[voucherStatus]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Giá trị</p>
                      <p className="font-medium">
                        {voucher.type === 'fixed' ? formatCurrency(voucher.value) : `${voucher.value}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Đơn tối thiểu</p>
                      <p className="font-medium">{formatCurrency(voucher.minOrderValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Đã dùng</p>
                      <p className="font-medium">
                        {voucher.usedCount ?? 0}/{voucher.usageLimit ?? '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hết hạn</p>
                      <p className="font-medium">{voucher.endDate ? formatDate(voucher.endDate) : '—'}</p>
                    </div>
                  </div>
                  {usagePercent !== null && usagePercent >= 80 ? (
                    <p className="text-xs text-amber-700">Gần hết lượt sử dụng ({usagePercent}%)</p>
                  ) : null}
                  <div className="flex justify-end gap-1 border-t border-border/60 pt-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(voucher)} aria-label="Sửa">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(voucher.id)}
                      aria-label="Xóa"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </AdminDataPanel>
              )
            })}
          </div>
        </>
      )}

      <VoucherFormDialog open={open} onOpenChange={setOpen} voucher={editing} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(openState) => !openState && setDeleteId(null)}
        title="Xóa voucher?"
        description="Không thể xóa voucher đã dùng trong đơn hàng."
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteVoucher.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa voucher'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}