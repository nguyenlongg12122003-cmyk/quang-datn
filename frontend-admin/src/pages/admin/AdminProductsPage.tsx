import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
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
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  )
  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b.name])),
    [brands],
  )

  const [deleting, setDeleting] = useState<Product | null>(null)

  const hasFilters =
    Boolean(debouncedSearch.trim()) ||
    status !== 'all' ||
    categoryId !== 'all' ||
    brandId !== 'all'

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

  const openCreate = () => navigate('/products/new')

  const openEdit = (product: Product) => navigate(`/products/${product.id}/edit`)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sản phẩm</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `Hiển thị ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} / ${formatNumber(total)} sản phẩm`
              : 'Quản lý danh mục hàng hóa cửa hàng'}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="size-4" /> Thêm sản phẩm
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm tên, SKU, mô tả, tags…"
            className="pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as ProductStatus | 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={brandId}
          onValueChange={(v) => {
            setBrandId(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Thương hiệu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thương hiệu</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v as NonNullable<ProductQuery['sortBy']>)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Xóa bộ lọc
          </Button>
        ) : null}

        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Làm mới danh sách"
        >
          <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
        </Button>
      </div>

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

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Đang tải…
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <p className="text-muted-foreground">
                    {hasFilters ? 'Không tìm thấy sản phẩm phù hợp bộ lọc.' : 'Chưa có sản phẩm nào.'}
                  </p>
                  {hasFilters ? (
                    <Button variant="link" className="mt-1" onClick={resetFilters}>
                      Xóa bộ lọc
                    </Button>
                  ) : (
                    <Button variant="link" className="mt-1 gap-1" onClick={openCreate}>
                      <Plus className="size-4" /> Thêm sản phẩm đầu tiên
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const stockStatus = getStockStatus(p.stock)
                const flashActive = isFlashSaleActive(p)

                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-start gap-2.5">
                        {p.images?.[0]?.url ? (
                          <img
                            src={p.images[0].url}
                            alt={p.name}
                            className="size-11 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div className="size-11 shrink-0 rounded-md bg-muted" />
                        )}
                        <div className="min-w-0 space-y-1">
                          <p className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {flashActive ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Flash Sale
                              </Badge>
                            ) : null}
                            {p.isCustomizable ? (
                              <Badge variant="outline" className="text-[10px]">
                                Tùy chỉnh
                              </Badge>
                            ) : null}
                            {(p.wholesalePrice?.length ?? 0) > 0 ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Giá sỉ
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-sm">{categoryMap[p.categoryId] ?? '—'}</TableCell>
                    <TableCell className="text-sm">{brandMap[p.brandId] ?? '—'}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{formatCurrency(p.price)}</div>
                      {p.originalPrice > p.price ? (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatCurrency(p.originalPrice)}
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
                        {formatNumber(p.stock)}
                      </span>
                      {stockStatus !== 'ok' ? (
                        <div className="text-[11px] text-muted-foreground">
                          {STOCK_STATUS_LABELS[stockStatus]}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatNumber(p.sold ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                        {STATUS_LABELS[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                        aria-label={`Sửa ${p.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleting(p)}
                        aria-label={`Xóa ${p.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

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