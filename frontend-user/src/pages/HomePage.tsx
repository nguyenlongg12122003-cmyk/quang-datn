import { PageContainer } from '@/components/layout/PageContainer'
import { useBrands, useCategories, useProducts } from '@/features/catalog/api'
import { BrandMarquee } from '@/features/home/BrandMarquee'
import { CategoryPills } from '@/features/home/CategoryPills'
import { FlashSaleSection } from '@/features/home/FlashSaleSection'
import { HeroCarousel } from '@/features/home/HeroCarousel'
import { MidPageBanners } from '@/features/home/MidPageBanners'
import { NewsletterCta } from '@/features/home/NewsletterCta'
import { ProductRowSection } from '@/features/home/ProductRowSection'
import { ShopByNeed } from '@/features/home/ShopByNeed'
import { Testimonials } from '@/features/home/Testimonials'

const BEST_SELLER_TABS = [
  { label: 'Tất cả', to: '/products?sortBy=popular' },
  { label: 'Dưới 50k', to: '/products?sortBy=popular&maxPrice=50000' },
  { label: '50k – 200k', to: '/products?sortBy=popular&minPrice=50000&maxPrice=200000' },
  { label: 'Trên 200k', to: '/products?sortBy=popular&minPrice=200000' },
] as const

export function HomePage() {
  const { data: categories = [] } = useCategories()
  const { data: brands = [], isLoading: brandsLoading } = useBrands()

  const flashSale = useProducts({ status: 'active', isFlashSale: true, limit: 12 })
  const bestSellers = useProducts({ status: 'active', sortBy: 'popular', limit: 12 })
  const newArrivals = useProducts({ status: 'active', sortBy: 'newest', limit: 12 })

  return (
    <div>
      <HeroCarousel />

      <PageContainer className="space-y-16 py-10">
        <CategoryPills categories={categories} />
        <FlashSaleSection
          products={flashSale.data?.items ?? []}
          loading={flashSale.isLoading}
        />
        <ProductRowSection
          title="Bán chạy tuần này"
          description="Sản phẩm được khách hàng tin dùng nhiều nhất"
          viewAllTo="/products?sortBy=popular"
          products={bestSellers.data?.items ?? []}
          loading={bestSellers.isLoading}
          tabs={[...BEST_SELLER_TABS]}
          activeTabTo={BEST_SELLER_TABS[0].to}
        />
        <ProductRowSection
          title="Hàng mới về"
          description="Cập nhật sản phẩm mới nhất từ kho hàng"
          viewAllTo="/products?sortBy=newest"
          products={newArrivals.data?.items ?? []}
          loading={newArrivals.isLoading}
        />
        <ShopByNeed />
        <MidPageBanners />
        <BrandMarquee brands={brands} loading={brandsLoading} />
        <Testimonials />
        <NewsletterCta />
      </PageContainer>
    </div>
  )
}