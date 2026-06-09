import { useMemo, useState } from 'react'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminActiveFilterChips } from '@/components/admin/AdminActiveFilterChips'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { AdminFilterField } from '@/components/admin/AdminFilterField'
import { AdminFilterSelect } from '@/components/admin/AdminFilterSelect'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useCategories } from '@/features/catalog/api'
import { useDeleteCategory, useSaveCategory } from '@/features/admin/api'
import { useDebounce } from '@/hooks/use-debounce'
import { matchesSearchQuery, sortByNumber, sortByString } from '@/lib/admin-list'
import { formatNumber } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types'

type ProductFilter = 'all' | 'has_products' | 'empty'
type CategorySort = 'name_asc' | 'name_desc' | 'products_desc' | 'products_asc'

const PRODUCT_FILTERS: Array<{ value: ProductFilter; label: string }> = [
  { value: 'all', label: 'Tất cả danh mục' },
  { value: 'has_products', label: 'Có sản phẩm' },
  { value: 'empty', label: 'Chưa có SP' },
]

const SORT_OPTIONS: Array<{ value: CategorySort; label: string }> = [
  { value: 'name_asc', label: 'Tên A → Z' },
  { value: 'name_desc', label: 'Tên Z → A' },
  { value: 'products_desc', label: 'Nhiều SP nhất' },
  { value: 'products_asc', label: 'Ít SP nhất' },
]

export function AdminCategoriesPage() {
  const { data: categories = [], isLoading, isFetching, refetch } = useCategories()
  const saveCategory = useSaveCategory()
  const deleteCategory = useDeleteCategory()
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', icon: '', description: '' })
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState<ProductFilter>('all')
  const [sort, setSort] = useState<CategorySort>('name_asc')
  const debouncedSearch = useDebounce(search, 250)

  const filteredCategories = useMemo(() => {
    let result = categories.filter((category) =>
      matchesSearchQuery(debouncedSearch, category.name, category.slug, category.description),
    )

    if (productFilter === 'has_products') {
      result = result.filter((category) => (category.productCount ?? 0) > 0)
    } else if (productFilter === 'empty') {
      result = result.filter((category) => (category.productCount ?? 0) === 0)
    }

    if (sort === 'products_desc') {
      return sortByNumber(result, (category) => category.productCount ?? 0, 'desc')
    }
    if (sort === 'products_asc') {
      return sortByNumber(result, (category) => category.productCount ?? 0, 'asc')
    }

    return sortByString(result, (category) => category.name, sort === 'name_asc' ? 'asc' : 'desc')
  }, [categories, debouncedSearch, productFilter, sort])

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) || productFilter !== 'all' || sort !== 'name_asc'

  const filterChips = [
    debouncedSearch.trim()
      ? { key: 'q', label: `Tìm: "${debouncedSearch.trim()}"`, onRemove: () => setSearch('') }
      : null,
    productFilter !== 'all'
      ? {
          key: 'products',
          label: PRODUCT_FILTERS.find((option) => option.value === productFilter)?.label ?? productFilter,
          onRemove: () => setProductFilter('all'),
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
    setProductFilter('all')
    setSort('name_asc')
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', slug: '', icon: '', description: '' })
    setOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      icon: category.icon ?? '',
      description: category.description ?? '',
    })
    setOpen(true)
  }

  const submit = () => {
    if (!form.name.trim()) {
      toast.error('Nhập tên danh mục')
      return
    }
    const payload = { ...form, slug: form.slug || slugify(form.name) }
    saveCategory.mutate(
      { id: editing?.id, payload },
      {
        onSuccess: () => {
          toast.success(editing ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục')
          setOpen(false)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Danh mục"
        description={
          isLoading
            ? 'Đang tải…'
            : `Hiển thị ${formatNumber(filteredCategories.length)} / ${formatNumber(categories.length)} danh mục`
        }
        action={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="size-4" /> Thêm danh mục
          </Button>
        }
      />

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm tên, slug, mô tả…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        activeFilterCount={filterChips.filter((chip) => chip.key !== 'q').length}
        footer={<AdminActiveFilterChips chips={filterChips} onClearAll={hasActiveFilters ? resetFilters : undefined} />}
        filters={
          <>
            <AdminFilterField label="Sản phẩm">
              <AdminFilterSelect
                value={productFilter}
                onValueChange={(value) => setProductFilter(value as ProductFilter)}
                options={PRODUCT_FILTERS}
              />
            </AdminFilterField>
            <AdminFilterField label="Sắp xếp">
              <AdminFilterSelect
                value={sort}
                onValueChange={(value) => setSort(value as CategorySort)}
                options={SORT_OPTIONS}
              />
            </AdminFilterField>
          </>
        }
      />

      {isLoading ? (
        <AdminTableSkeleton rows={5} columns={4} />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title={hasActiveFilters ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục'}
          description={
            hasActiveFilters
              ? 'Thử đổi từ khóa hoặc xóa bộ lọc.'
              : 'Tạo danh mục để phân loại sản phẩm.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Thêm danh mục
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
                  <TableHead>Tên</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Số sản phẩm</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell>
                      <Badge variant={(category.productCount ?? 0) > 0 ? 'secondary' : 'outline'}>
                        {formatNumber(category.productCount ?? 0)} SP
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(category)} aria-label="Sửa">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(category.id)}
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
            {filteredCategories.map((category) => (
              <AdminDataPanel key={category.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{category.slug}</p>
                  </div>
                  <Badge variant={(category.productCount ?? 0) > 0 ? 'secondary' : 'outline'}>
                    {formatNumber(category.productCount ?? 0)} SP
                  </Badge>
                </div>
                {category.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
                ) : null}
                <div className="flex justify-end gap-1 border-t border-border/60 pt-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(category)} aria-label="Sửa">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteId(category.id)}
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
            <DialogTitle>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên danh mục</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (tự tạo nếu để trống)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (tên lucide, tùy chọn)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saveCategory.isPending}>
              {saveCategory.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(openState) => !openState && setDeleteId(null)}
        title="Xóa danh mục?"
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteCategory.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa danh mục'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}