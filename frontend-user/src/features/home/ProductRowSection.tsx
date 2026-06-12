import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/layout/PageContainer'
import { ProductCarousel } from '@/features/home/components/ProductCarousel'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

export interface PriceFilterTab {
  label: string
  to: string
}

interface ProductRowSectionProps {
  title: string
  description?: string
  viewAllTo: string
  products: Product[]
  loading?: boolean
  tabs?: PriceFilterTab[]
  activeTabTo?: string
  skeletonCount?: number
  className?: string
}

export function ProductRowSection({
  title,
  description,
  viewAllTo,
  products,
  loading,
  tabs,
  activeTabTo,
  skeletonCount = 5,
  className,
}: ProductRowSectionProps) {
  if (!loading && products.length === 0) return null

  return (
    <section className={cn(className)}>
      <SectionHeading
        title={title}
        description={description}
        action={
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to={viewAllTo}>
              Xem tất cả
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {tabs && tabs.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.to}
              asChild
              size="sm"
              variant={activeTabTo === tab.to ? 'default' : 'outline'}
            >
              <Link to={tab.to}>{tab.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}

      <ProductCarousel
        products={products}
        loading={loading}
        skeletonCount={skeletonCount}
      />
    </section>
  )
}