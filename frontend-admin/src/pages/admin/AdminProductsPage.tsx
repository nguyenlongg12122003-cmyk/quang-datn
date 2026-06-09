import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Package, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { useBrands, useCategories, useProducts } from '@/features/catalog/api'
import { useDeleteProduct } from '@/features/admin/api'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import { isFlashSaleActive, getStockStatus, STOCK_STATUS_LABELS } from '@/lib/product'
import type { ProductQuery } from '@/lib/api/endpoints/catalog'
import type { Product, ProductStatus } from '@/types'

const PAGE_SIZE = 20

const STATUS_OPTIONS: Array<{ value: ProductStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Ngừng bán' },
  { value: 'draft', label: 'Nháp' },
]

const SORT_OPTIONS: Array<{ value: NonNullable<ProductQuery['sortBy']>; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Bán chạy' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
]

const STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Đang bán',
  inactive: 'Ngừng',
  draft: 'Nháp',
}

export function AdminProductsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProductStatus | 'all'>('all')
  const [categoryId, setCategoryId] = useState('all')
  const [brandId, setBrandId] = useState('all')
  const [sortBy, setSortBy] = useState<NonNullable<ProductQuery['sortBy']>>('newest')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const query = useMemo<ProductQuery>(
    () => ({
      q: debouncedSearch.trim() || undefined,
      status: status === 'all' ? undefined : status,
      categoryId: categoryId === 'all' ? undefined : categoryId,
      brandId: brandId === 'all' ? undefined : brandId,
      sortBy,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, status, categoryId, brandId, sortBy, page],
  )

  const { data: categories = [] } = useCategories()
  const { data: brands = [] } = useBrands()
  const { data, isLoading, isError, error, refetch, isFetching } = useProducts(query)
  const deleteProduct = useDeleteProduct()

  const products = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )
  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((brand) => [brand.id, brand.name])),
    [brands],
  )

  const [deleting, setDeleting] = useState<Product | null>(null)

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) ||
    status !== 'all' ||
    categoryId !== 'all' ||
    brandId !== 'all' ||
    sortBy !== 'newest'

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  useEffect(() => {
    if (!isLoading && page > pageCount) {
      setPage(pageCount)
    }
  }, [isLoading, page, pageCount])

  const resetFilters = () => {
    setSearch('')
    setStatus('all')
    setCategoryId('all')
    setBrandId('all')
    setSortBy('newest')
    setPage(1)
  }

  const filterChips = [
    debouncedSearch.trim()
      ? { key: 'q', label: `Tìm: "${debouncedSearch.trim()}"`, onRemove: () => setSearch('') }
      : null,
    status !== 'all'
      ? {
          key: 'status',
          label: STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status,
          onRemove: () => setStatus('all'),
        }
      : null,
    categoryId !== 'all'
      ? {
          key: 'category',
          label: categoryMap[categoryId] ?? 'Danh mục',
          onRemove: () => setCategoryId('all'),
        }
      : null,
    brandId !== 'all'
      ? {
          key: 'brand',
          label: brandMap[brandId] ?? 'Thương hiệu',
          onRemove: () => setBrandId('all'),
        }
      : null,
    sortBy !== 'newest'
      ? {
          key: 'sort',
          label: SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? sortBy,
          onRemove: () => setSortBy('newest'),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>

  const openCreate = () => navigate('/products/new')
  const openEdit = (product: Product) => navigate(`/products/${product.id}/edit`)

  const renderProductBadges = (product: Product) => {
    const flashActive = isFlashSaleActive(product)
    return (
      <div className="flex flex-wrap gap-1">
        {flashActive ? (
          <Badge variant="destructive" className="text-[10px]">
            Flash Sale
          </Badge>
        ) : null}
        {product.isCustomizable ? (
          <Badge variant="outline" className="text-[10px]">
            Tùy chỉnh
          </Badge>
        ) : null}
        {(product.wholesalePrice?.length ?? 0) > 0 ? (
          <Badge variant="secondary" className="text-[10px]">
            Giá sỉ
          </Badge>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Sản phẩm"
        description={
          total > 0
            ? `Hiển thị ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} / ${formatNumber(total)} sản phẩm`
            : 'Quản lý danh mục hàng hóa cửa hàng'
        }
        action={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="size-4" /> Thêm sản phẩm
          </Button>
        }
      />

      <AdminListToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchPlaceholder="Tìm tên, SKU, mô tả, tags…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        activeFilterCount={filterChips.filter((chip) => chip.key !== 'q').length}
        footer={
          <AdminActiveFilterChips chips={filterChips} onClearAll={hasActiveFilters ? resetFilters : undefined} />
        }
        filters={
          <>
            <AdminFilterField label="Trạng thái">
              <AdminFilterSelect
                value={status}
                onValueChange={(value) => {
                  setStatus(value as ProductStatus | 'all')
                  setPage(1)
                }}
                options={STATUS_OPTIONS}
              />
            </AdminFilterField>
            <AdminFilterField label="Danh mục">
              <AdminFilterSelect
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value)
                  setPage(1)
                }}
                options={[
                  { value: 'all', label: 'Tất cả danh mục' },
                  ...categories.map((category) => ({ value: category.id, label: category.name })),
                ]}
              />
            </AdminFilterField>
            <AdminFilterField label="Thương hiệu">
              <AdminFilterSelect
                value={brandId}
                onValueChange={(value) => {
                  setBrandId(value)
                  setPage(1)
                }}
                options={[
                  { value: 'all', label: 'Tất cả thương hiệu' },
                  ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                ]}
              />
            </AdminFilterField>
            <AdminFilterField label="Sắp xếp">
              <AdminFilterSelect
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as NonNullable<ProductQuery['sortBy']>)
                  setPage(1)
                }}
                options={SORT_OPTIONS}
              />
            </AdminFilterField>
          </>
        }
      />

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Không tải được danh sách sản phẩm</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{getErrorMessage(error)}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <AdminTableSkeleton rows={6} columns={6} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm'}
          description={
            hasActiveFilters
              ? 'Thử đổi từ khóa hoặc xóa bộ lọc.'
              : 'Thêm sản phẩm đầu tiên để bắt đầu bán hàng.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Thêm sản phẩm
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
                  <TableHead className="min-w-[240px]">Sản phẩm</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Thương hiệu</TableHead>
                  <TableHead>Giá</TableHead>
                  <TableHead>Tồn</TableHead>
                  <TableHead>Đã bán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.stock, product.lowStockThreshold ?? 10)

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="size-11 shrink-0 rounded-md border border-border/60 object-cover"
                            />
                          ) : (
                            <div className="size-11 shrink-0 rounded-md border border-dashed border-border bg-muted/50" />
                          )}
                          <div className="min-w-0 space-y-1">
                            <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
                            {renderProductBadges(product)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="text-sm">{categoryMap[product.categoryId] ?? '—'}</TableCell>
                      <TableCell className="text-sm">{brandMap[product.brandId] ?? '—'}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{formatCurrency(product.price)}</div>
                        {product.originalPrice > product.price ? (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.originalPrice)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            stockStatus === 'out'
                              ? 'font-semibold text-destructive'
                              : stockStatus === 'low'
                                ? 'font-medium text-amber-600'
                                : ''
                          }
                        >
                          {formatNumber(product.stock)}
                        </span>
                        {stockStatus !== 'ok' ? (
                          <div className="text-[11px] text-muted-foreground">
                            {STOCK_STATUS_LABELS[stockStatus]}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatNumber(product.sold ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {STATUS_LABELS[product.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(product)}
                          aria-label={`Sửa ${product.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleting(product)}
                          aria-label={`Xóa ${product.name}`}
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
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.lowStockThreshold ?? 10)

              return (
                <AdminDataPanel key={product.id} className="p-4">
                  <div className="flex gap-3">
                    {product.images?.[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="size-14 shrink-0 rounded-md border border-border/60 object-cover"
                      />
                    ) : (
                      <div className="size-14 shrink-0 rounded-md border border-dashed border-border bg-muted/50" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-2 font-medium leading-snug">{product.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                      {renderProductBadges(product)}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Giá</p>
                      <p className="font-medium">{formatCurrency(product.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tồn kho</p>
                      <p className="font-medium">{formatNumber(product.stock)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {STATUS_LABELS[product.status]}
                    </Badge>
                    {stockStatus !== 'ok' ? (
                      <span className="text-xs text-muted-foreground">{STOCK_STATUS_LABELS[stockStatus]}</span>
                    ) : null}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label="Sửa">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleting(product)}
                        aria-label="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </AdminDataPanel>
              )
            })}
          </div>
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa sản phẩm?"
        description={
          deleting
            ? `Bạn sắp xóa "${deleting.name}" (SKU: ${deleting.sku}). Thao tác này không thể hoàn tác.`
            : undefined
        }
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleting) return
          deleteProduct.mutate(deleting.id, {
            onSuccess: () => toast.success(`Đã xóa "${deleting.name}"`),
            onError: (err) => toast.error(getErrorMessage(err)),
          })
          setDeleting(null)
        }}
      />
    </div>
  )
}