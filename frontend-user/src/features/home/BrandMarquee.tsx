import { Award } from 'lucide-react'
import { SectionHeading } from '@/components/layout/PageContainer'
import { Skeleton } from '@/components/ui/skeleton'
import type { Brand } from '@/types'

interface BrandMarqueeProps {
  brands: Brand[]
  loading?: boolean
}

function BrandChip({ brand }: { brand: Brand }) {
  return (
    <div className="flex h-14 min-w-[120px] shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 shadow-sm">
      {brand.logo ? (
        <img
          src={brand.logo}
          alt={brand.name}
          className="max-h-8 max-w-[100px] object-contain"
          loading="lazy"
        />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">{brand.name}</span>
      )}
    </div>
  )
}

export function BrandMarquee({ brands, loading }: BrandMarqueeProps) {
  if (!loading && brands.length === 0) return null

  const duplicated = loading ? [] : [...brands, ...brands]

  return (
    <section>
      <SectionHeading
        title="Thương hiệu nổi bật"
        description="Hàng chính hãng từ các thương hiệu uy tín"
      />

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-[120px] shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/30 py-4">
          <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full items-center bg-gradient-to-r from-secondary/80 to-transparent px-3">
            <Award className="size-5 text-primary" aria-hidden />
          </div>
          <div className="flex w-max animate-marquee gap-4 px-12 hover:[animation-play-state:paused]">
            {duplicated.map((brand, index) => (
              <BrandChip key={`${brand.id}-${index}`} brand={brand} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}