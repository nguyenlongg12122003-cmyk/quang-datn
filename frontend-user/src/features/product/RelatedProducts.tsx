import { SectionHeading } from '@/components/layout/PageContainer'
import { ProductCarousel } from '@/features/home/components/ProductCarousel'
import { useProducts } from '@/features/catalog/api'
import type { Product } from '@/types'

interface RelatedProductsProps {
  product: Product
}

export function RelatedProducts({ product }: RelatedProductsProps) {
  const { data, isLoading } = useProducts({
    categoryId: product.categoryId,
    limit: 8,
    page: 1,
    sortBy: 'popular',
  })

  const related = (data?.items ?? []).filter((p) => p.id !== product.id).slice(0, 6)
  if (!isLoading && related.length === 0) return null

  return (
    <section className="space-y-4">
      <SectionHeading title="Sản phẩm liên quan" />
      <ProductCarousel products={related} loading={isLoading} skeletonCount={4} />
    </section>
  )
}