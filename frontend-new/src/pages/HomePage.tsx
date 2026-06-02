import { Link } from 'react-router'
import { ArrowRight, Sparkles, Truck, ShieldCheck, Headset } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContainer, SectionHeading } from '@/components/layout/PageContainer'
import { ProductGrid } from '@/components/common/ProductGrid'
import { useCategories, useProducts } from '@/features/catalog/api'

export function HomePage() {
  const { data: categories = [] } = useCategories()
  const flashSale = useProducts({ status: 'active', isFlashSale: true, limit: 10 })
  const bestSellers = useProducts({ status: 'active', sortBy: 'popular', limit: 10 })

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-background to-secondary">
        <PageContainer className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="size-4" /> Văn phòng phẩm chính hãng
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Mọi thứ cho{' '}
              <span className="text-primary">học tập &amp; công việc</span>
            </h1>
            <p className="max-w-md text-muted-foreground">
              Bút, giấy, dụng cụ văn phòng chất lượng cao. Giá sỉ hấp dẫn, in ấn
              tùy chỉnh theo yêu cầu, giao hàng nhanh chóng.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/products">
                  Mua ngay <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/products?isFlashSale=true">Flash Sale</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Truck, label: 'Giao nhanh toàn quốc' },
              { icon: ShieldCheck, label: 'Hàng chính hãng' },
              { icon: Headset, label: 'Hỗ trợ tận tâm' },
            ].map((f) => (
              <Card key={f.label} className="items-center gap-2 p-4 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
                  <f.icon className="size-6" />
                </span>
                <p className="text-xs font-medium">{f.label}</p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      <PageContainer className="space-y-12">
        {/* Categories */}
        <section>
          <SectionHeading title="Danh mục nổi bật" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link key={c.id} to={`/categories/${c.slug}`}>
                <Card className="items-center gap-2 p-4 text-center transition-colors hover:border-primary">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="size-12 rounded-lg object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-lg bg-secondary text-primary font-bold">
                      {c.name.charAt(0)}
                    </span>
                  )}
                  <p className="line-clamp-1 text-sm font-medium">{c.name}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Flash sale */}
        {flashSale.isLoading || (flashSale.data && flashSale.data.length > 0) ? (
          <section>
            <SectionHeading
              title="⚡ Flash Sale"
              description="Ưu đãi có hạn, nhanh tay kẻo lỡ!"
              action={
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link to="/products?isFlashSale=true">
                    Xem tất cả <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
            />
            <ProductGrid products={flashSale.data ?? []} loading={flashSale.isLoading} skeletonCount={5} />
          </section>
        ) : null}

        {/* Best sellers */}
        <section>
          <SectionHeading
            title="Bán chạy nhất"
            action={
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link to="/products">
                  Xem tất cả <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <ProductGrid products={bestSellers.data ?? []} loading={bestSellers.isLoading} />
        </section>
      </PageContainer>
    </div>
  )
}
