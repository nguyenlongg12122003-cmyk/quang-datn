import { Link, useParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { ProductGallery } from '@/features/product/ProductGallery'
import { PurchasePanel } from '@/features/product/PurchasePanel'
import { ProductReviews } from '@/features/product/ProductReviews'
import { RelatedProducts } from '@/features/product/RelatedProducts'
import { useCategories, useProduct } from '@/features/catalog/api'
import {
  getDiscountPercent,
  hasB2BPricing,
  isFlashSaleActive,
} from '@/lib/product'
import { useApprovedBusinessPricing } from '@/features/business/useApprovedBusinessPricing'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: product, isLoading, isError } = useProduct(slug)
  const { data: categories = [] } = useCategories()
  const { hasB2BAccess, customerType } = useApprovedBusinessPricing()

  if (isLoading) {
    return (
      <PageContainer className="grid gap-8 pb-24 lg:grid-cols-2 lg:pb-6">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </PageContainer>
    )
  }

  if (isError || !product) {
    return (
      <PageContainer>
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description="Sản phẩm có thể đã bị gỡ hoặc không tồn tại."
        />
      </PageContainer>
    )
  }

  const category = categories.find((c) => c.id === product.categoryId)
  const showB2BBadge = hasB2BAccess && hasB2BPricing(product, customerType)
  const discountPercent = getDiscountPercent({
    ...product,
    flashSalePrice: showB2BBadge ? null : product.flashSalePrice,
    isFlashSale: showB2BBadge ? false : product.isFlashSale,
  })
  const flashSale = isFlashSaleActive(product) && !showB2BBadge
  const outOfStock = product.stock <= 0

  const hasDescription = Boolean(product.description?.trim())
  const hasSpecs =
    Boolean(product.specifications) && Object.keys(product.specifications ?? {}).length > 0
  const reviewCount = product.reviewCount ?? 0
  const defaultTab = hasDescription ? 'description' : hasSpecs ? 'specs' : 'reviews'

  return (
    <PageContainer className="space-y-10 pb-24 lg:pb-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Trang chủ</Link>
        <ChevronRight className="size-3" />
        <Link to="/products" className="hover:text-primary">Sản phẩm</Link>
        {category ? (
          <>
            <ChevronRight className="size-3" />
            <Link to={`/categories/${category.slug}`} className="hover:text-primary">
              {category.name}
            </Link>
          </>
        ) : null}
        <ChevronRight className="size-3" />
        <span className="line-clamp-1 text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <ProductGallery
          images={product.images ?? []}
          name={product.name}
          discountPercent={discountPercent}
          showFlashSale={flashSale}
          outOfStock={outOfStock}
        />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PurchasePanel product={product} />
        </div>
      </div>

      {product.tags && product.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <Tabs defaultValue={defaultTab} className="gap-4">
        <TabsList variant="line" className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
          {hasDescription ? (
            <TabsTrigger value="description" className="rounded-none px-4 py-2.5">
              Mô tả
            </TabsTrigger>
          ) : null}
          {hasSpecs ? (
            <TabsTrigger value="specs" className="rounded-none px-4 py-2.5">
              Thông số
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="reviews" className="rounded-none px-4 py-2.5">
            Đánh giá{reviewCount > 0 ? ` (${reviewCount})` : ''}
          </TabsTrigger>
        </TabsList>

        {hasDescription ? (
          <TabsContent value="description" className="mt-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {product.description}
            </p>
          </TabsContent>
        ) : null}

        {hasSpecs ? (
          <TabsContent value="specs" className="mt-4">
            <dl className="overflow-hidden rounded-xl border border-border">
              {Object.entries(product.specifications!).map(([key, value], i) => (
                <div
                  key={key}
                  className={i % 2 === 0 ? 'flex gap-4 bg-muted/40 px-4 py-2' : 'flex gap-4 px-4 py-2'}
                >
                  <dt className="w-40 shrink-0 text-sm text-muted-foreground">{key}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
        ) : null}

        <TabsContent value="reviews" className="mt-4">
          <ProductReviews productId={product.id} averageRating={product.rating} />
        </TabsContent>
      </Tabs>

      <RelatedProducts product={product} />
    </PageContainer>
  )
}