import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProductGrid } from '@/components/common/ProductGrid'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { ProductFilters, type FilterState } from '@/features/catalog/ProductFilters'
import { useProducts } from '@/features/catalog/api'
import type { ProductQuery } from '@/lib/api/endpoints/catalog'

const PAGE_SIZE = 20

const SORT_OPTIONS: Array<{ value: NonNullable<ProductQuery['sortBy']>; label: string }> = [
  { value: 'popular', label: 'Phổ biến' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá thấp → cao' },
  { value: 'price-desc', label: 'Giá cao → thấp' },
  { value: 'rating', label: 'Đánh giá cao' },
]

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlPage = Number(searchParams.get('page') || '1')
  const [page, setPage] = useState(() => (urlPage > 0 ? urlPage : 1))

  const q = searchParams.get('q') ?? undefined
  const sortBy = (searchParams.get('sortBy') as ProductQuery['sortBy']) ?? 'popular'

  const filters: FilterState = useMemo(
    () => ({
      categorySlug: searchParams.get('categorySlug') ?? undefined,
      brandId: searchParams.get('brandId') ?? undefined,
      isFlashSale: searchParams.get('isFlashSale') === 'true' || undefined,
      isCustomizable: searchParams.get('isCustomizable') === 'true' || undefined,
      hasWholesale: searchParams.get('hasWholesale') === 'true' || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    }),
    [searchParams],
  )

  const query: ProductQuery = {
    status: 'active',
    q,
    sortBy,
    page,
    limit: PAGE_SIZE,
    ...filters,
  }

  const { data, isLoading } = useProducts(query)
  const products = data?.items ?? []
  const total = data?.total ?? 0

  const updateParams = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, val]) => {
      if (val) params.set(key, val)
      else params.delete(key)
    })
    // Remove page when changing filters/search/sort
    params.delete('page')
    setSearchParams(params)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const params = new URLSearchParams(searchParams)
    if (newPage > 1) params.set('page', String(newPage))
    else params.delete('page')
    setSearchParams(params, { replace: true })
  }

  const applyFilters = (f: FilterState) =>
    updateParams({
      categorySlug: f.categorySlug,
      brandId: f.brandId,
      isFlashSale: f.isFlashSale ? 'true' : undefined,
      isCustomizable: f.isCustomizable ? 'true' : undefined,
      hasWholesale: f.hasWholesale ? 'true' : undefined,
      minPrice: f.minPrice != null ? String(f.minPrice) : undefined,
      maxPrice: f.maxPrice != null ? String(f.maxPrice) : undefined,
    })

  // Clear everything including search query
  const clearAll = () => {
    const params = new URLSearchParams()
    // keep sort if wanted, but for simplicity clear all
    setSearchParams(params)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{q ? `Kết quả cho "${q}"` : 'Tất cả sản phẩm'}</h1>
          <p className="text-sm text-muted-foreground">{total} sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                <SlidersHorizontal className="size-4" /> Lọc
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto p-4">
              <ProductFilters value={filters} onChange={applyFilters} onClear={clearAll} />
            </SheetContent>
          </Sheet>
          <Select value={sortBy} onValueChange={(v) => updateParams({ sortBy: v })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-border p-4">
            <ProductFilters value={filters} onChange={applyFilters} onClear={clearAll} />
          </div>
        </aside>

        <div className="space-y-6">
          {!isLoading && products.length === 0 ? (
            <EmptyState
              title="Không tìm thấy sản phẩm"
              description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
            />
          ) : (
            <>
              <ProductGrid products={products} loading={isLoading} />
              <Pagination page={page} pageCount={pageCount} onPageChange={handlePageChange} />
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
