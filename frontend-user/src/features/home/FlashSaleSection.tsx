import { Link } from 'react-router'
import { ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/layout/PageContainer'
import { CountdownTimer } from '@/features/home/components/CountdownTimer'
import { ProductCarousel } from '@/features/home/components/ProductCarousel'
import { getFlashSaleEndDate } from '@/features/home/utils'
import type { Product } from '@/types'

interface FlashSaleSectionProps {
  products: Product[]
  loading?: boolean
}

export function FlashSaleSection({ products, loading }: FlashSaleSectionProps) {
  if (!loading && products.length === 0) return null

  const endDate = getFlashSaleEndDate(products)

  return (
    <section className="-mx-4 rounded-none border-y border-commerce/20 bg-gradient-to-r from-commerce/5 via-brand-50/50 to-commerce/5 px-4 py-8 sm:mx-0 sm:rounded-2xl sm:border sm:px-6">
      <SectionHeading
        title="Flash Sale"
        description="Ưu đãi có hạn — nhanh tay kẻo lỡ"
        action={
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/products?isFlashSale=true">
              Xem tất cả
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-commerce px-2.5 py-0.5 text-xs font-semibold text-commerce-foreground">
          <Zap className="size-3.5" aria-hidden />
          Đang giảm giá
        </span>
        <CountdownTimer target={endDate} />
      </div>

      <ProductCarousel products={products} loading={loading} skeletonCount={5} />
    </section>
  )
}