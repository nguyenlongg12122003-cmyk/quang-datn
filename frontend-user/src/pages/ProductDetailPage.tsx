import { Link, useParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { ProductGallery } from '@/features/product/ProductGallery'
import { PurchasePanel } from '@/features/product/PurchasePanel'
import { ProductReviews } from '@/features/product/ProductReviews'
import { useProduct } from '@/features/catalog/api'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: product, isLoading, isError } = useProduct(slug)

  if (isLoading) {
    return (
      <PageContainer className="grid gap-8 lg:grid-cols-2">
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

  return (
    <PageContainer className="space-y-10">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Trang chủ</Link>
        <ChevronRight className="size-3" />
        <Link to="/products" className="hover:text-primary">Sản phẩm</Link>
        <ChevronRight className="size-3" />
        <span className="line-clamp-1 text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images ?? []} name={product.name} />
        <PurchasePanel product={product} />
      </div>

      {product.description ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Mô tả sản phẩm</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {product.description}
          </p>
        </section>
      ) : null}

      {product.specifications && Object.keys(product.specifications).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Thông số kỹ thuật</h2>
          <dl className="overflow-hidden rounded-xl border border-border">
            {Object.entries(product.specifications).map(([key, value], i) => (
              <div
                key={key}
                className={i % 2 === 0 ? 'flex gap-4 bg-muted/40 px-4 py-2' : 'flex gap-4 px-4 py-2'}
              >
                <dt className="w-40 shrink-0 text-sm text-muted-foreground">{key}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <Separator />

      <ProductReviews productId={product.id} />
    </PageContainer>
  )
}
