import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SectionHeading } from '@/components/layout/PageContainer'
import { SHOP_BY_NEED_ITEMS } from '@/features/home/constants'
import { cn } from '@/lib/utils'

export function ShopByNeed() {
  return (
    <section>
      <SectionHeading
        title="Mua theo nhu cầu"
        description="Giải pháp văn phòng phẩm cho từng đối tượng khách hàng"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SHOP_BY_NEED_ITEMS.map((item) => (
          <Link key={item.id} to={item.to} className="group">
            <Card className="flex h-full flex-row items-start gap-4 p-5 transition-shadow hover:shadow-md">
              <span
                className={cn(
                  'grid size-12 shrink-0 place-items-center rounded-xl',
                  item.accentClass,
                )}
              >
                <item.icon className="size-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="font-semibold group-hover:text-primary">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <span className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                  Khám phá
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}