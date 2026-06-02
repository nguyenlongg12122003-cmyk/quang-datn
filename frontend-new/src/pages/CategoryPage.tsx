import { useState } from 'react'
import { useParams } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProductGrid } from '@/components/common/ProductGrid'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { useCategories, useProducts } from '@/features/catalog/api'

const PAGE_SIZE = 20

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState(1)
  const { data: categories = [] } = useCategories()
  const category = categories.find((c) => c.slug === slug)
  const { data: products = [], isLoading } = useProducts({
    status: 'active',
    categorySlug: slug,
    sortBy: 'popular',
  })

  const pageCount = Math.ceil(products.length / PAGE_SIZE)
  const pageItems = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{category?.name ?? 'Danh mục'}</h1>
        {category?.description ? (
          <p className="text-sm text-muted-foreground">{category.description}</p>
        ) : null}
      </div>

      {!isLoading && products.length === 0 ? (
        <EmptyState title="Danh mục chưa có sản phẩm" />
      ) : (
        <>
          <ProductGrid products={pageItems} loading={isLoading} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </PageContainer>
  )
}
