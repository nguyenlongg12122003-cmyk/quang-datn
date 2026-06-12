import { Quote, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SectionHeading } from '@/components/layout/PageContainer'
import { TESTIMONIALS } from '@/features/home/constants'
import { cn } from '@/lib/utils'

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-4',
            i < rating ? 'fill-commerce text-commerce' : 'text-muted-foreground/30',
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}

export function Testimonials() {
  return (
    <section>
      <SectionHeading
        title="Khách hàng nói gì"
        description="Phản hồi thực tế từ khách hàng cá nhân và doanh nghiệp"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <Card key={item.id} className="relative gap-4 p-5">
            <Quote className="size-8 text-primary/15" aria-hidden />
            <RatingStars rating={item.rating} />
            <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{item.quote}&rdquo;</p>
            <div className="mt-auto space-y-1 border-t border-border pt-4">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.role}</p>
              <p className="text-xs text-primary">Đã mua: {item.product}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}