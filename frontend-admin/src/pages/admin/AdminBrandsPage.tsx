import { useMemo, useState } from 'react'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminActiveFilterChips } from '@/components/admin/AdminActiveFilterChips'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { AdminFilterField } from '@/components/admin/AdminFilterField'
import { AdminFilterSelect } from '@/components/admin/AdminFilterSelect'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/common/ImageUploader'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useBrands } from '@/features/catalog/api'
import { useDeleteBrand, useSaveBrand } from '@/features/admin/api'
import { useDebounce } from '@/hooks/use-debounce'
import { matchesSearchQuery, sortByString } from '@/lib/admin-list'
import { formatNumber } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { Brand } from '@/types'

type LogoFilter = 'all' | 'with_logo' | 'without_logo'
type BrandSort = 'name_asc' | 'name_desc'

const LOGO_FILTERS: Array<{ value: LogoFilter; label: string }> = [
  { value: 'all', label: 'Tất cả logo' },
  { value: 'with_logo', label: 'Có logo' },
  { value: 'without_logo', label: 'Chưa có logo' },
]

const SORT_OPTIONS: Array<{ value: BrandSort; label: string }> = [
  { value: 'name_asc', label: 'Tên A → Z' },
  { value: 'name_desc', label: 'Tên Z → A' },
]

export function AdminBrandsPage() {
  const { data: brands = [], isLoading, isFetching, refetch } = useBrands()
  const saveBrand = useSaveBrand()
  const deleteBrand = useDeleteBrand()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', logo: '' })
  const [search, setSearch] = useState('')
  const [logoFilter, setLogoFilter] = useState<LogoFilter>('all')
  const [sort, setSort] = useState<BrandSort>('name_asc')
  const debouncedSearch = useDebounce(search, 250)

  const filteredBrands = useMemo(() => {
    let result = brands.filter((brand) => matchesSearchQuery(debouncedSearch, brand.name))

    if (logoFilter === 'with_logo') {
      result = result.filter((brand) => Boolean(brand.logo?.trim()))
    } else if (logoFilter === 'without_logo') {
      result = result.filter((brand) => !brand.logo?.trim())
    }

    return sortByString(result, (brand) => brand.name, sort === 'name_asc' ? 'asc' : 'desc')
  }, [brands, debouncedSearch, logoFilter, sort])

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) || logoFilter !== 'all' || sort !== 'name_asc'

  const filterChips = [
    debouncedSearch.trim()
      ? { key: 'q', label: `Tìm: "${debouncedSearch.trim()}"`, onRemove: () => setSearch('') }
      : null,
    logoFilter !== 'all'
      ? {
          key: 'logo',
          label: LOGO_FILTERS.find((option) => option.value === logoFilter)?.label ?? logoFilter,
          onRemove: () => setLogoFilter('all'),
        }
      : null,
    sort !== 'name_asc'
      ? {
          key: 'sort',
          label: SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort,
          onRemove: () => setSort('name_asc'),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>

  const resetFilters = () => {
    setSearch('')
    setLogoFilter('all')
    setSort('name_asc')
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', logo: '' })
    setOpen(true)
  }

  const openEdit = (brand: Brand) => {
    setEditing(brand)
    setForm({ name: brand.name, logo: brand.logo ?? '' })
    setOpen(true)
  }

  const submit = () => {
    if (!form.name.trim()) {
      toast.error('Nhập tên thương hiệu')
      return
    }
    saveBrand.mutate(
      { id: editing?.id, payload: { name: form.name, logo: form.logo || undefined } },
      {
        onSuccess: () => {
          toast.success(editing ? 'Đã cập nhật' : 'Đã thêm thương hiệu')
          setOpen(false)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Thương hiệu"
        description={
          isLoading
            ? 'Đang tải…'
            : `Hiển thị ${formatNumber(filteredBrands.length)} / ${formatNumber(brands.length)} thương hiệu`
        }
        action={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="size-4" /> Thêm thương hiệu
          </Button>
        }
      />

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm tên thương hiệu…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        activeFilterCount={filterChips.filter((chip) => chip.key !== 'q').length}
        footer={<AdminActiveFilterChips chips={filterChips} onClearAll={hasActiveFilters ? resetFilters : undefined} />}
        filters={
          <>
            <AdminFilterField label="Logo">
              <AdminFilterSelect
                value={logoFilter}
                onValueChange={(value) => setLogoFilter(value as LogoFilter)}
                options={LOGO_FILTERS}
              />
            </AdminFilterField>
            <AdminFilterField label="Sắp xếp">
              <AdminFilterSelect
                value={sort}
                onValueChange={(value) => setSort(value as BrandSort)}
                options={SORT_OPTIONS}
              />
            </AdminFilterField>
          </>
        }
      />

      {isLoading ? (
        <AdminTableSkeleton rows={5} columns={3} />
      ) : filteredBrands.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={hasActiveFilters ? 'Không tìm thấy thương hiệu phù hợp' : 'Chưa có thương hiệu'}
          description={
            hasActiveFilters
              ? 'Thử đổi từ khóa hoặc xóa bộ lọc.'
              : 'Thêm thương hiệu để gắn vào sản phẩm.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Thêm thương hiệu
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
                  <TableHead>Logo</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      {brand.logo ? (
                        <img src={brand.logo} alt={brand.name} className="size-9 rounded object-contain" />
                      ) : (
                        <span className="grid size-9 place-items-center rounded bg-secondary text-xs font-bold text-primary">
                          {brand.name.charAt(0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(brand)} aria-label="Sửa">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(brand.id)}
                        aria-label="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminDataPanel>

          <div className="space-y-3 md:hidden">
            {filteredBrands.map((brand) => (
              <AdminDataPanel key={brand.id} className="flex items-center gap-3 p-4">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="size-10 rounded object-contain" />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded bg-secondary text-sm font-bold text-primary">
                    {brand.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{brand.name}</p>
                  <p className="text-xs text-muted-foreground">{brand.logo ? 'Có logo' : 'Chưa có logo'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(brand)} aria-label="Sửa">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteId(brand.id)}
                    aria-label="Xóa"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </AdminDataPanel>
            ))}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên thương hiệu</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <ImageUploader
                value={form.logo}
                onChange={(url) => setForm({ ...form, logo: url })}
                previewClassName="size-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saveBrand.isPending}>
              {saveBrand.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(openState) => !openState && setDeleteId(null)}
        title="Xóa thương hiệu?"
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteBrand.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}