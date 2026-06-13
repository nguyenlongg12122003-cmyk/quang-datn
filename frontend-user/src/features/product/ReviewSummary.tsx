import { RatingStars } from '@/components/common/RatingStars'
import { cn } from '@/lib/utils'
import type { ProductReview } from '@/types'

interface ReviewSummaryProps {
  reviews: ProductReview[]
  averageRating?: number
  className?: string
}

function buildDistribution(reviews: ProductReview[]) {
  const counts = [0, 0, 0, 0, 0, 0]
  for (const review of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(review.rating)))
    counts[star] += 1
  }
  return counts
}

export function ReviewSummary({ reviews, averageRating, className }: ReviewSummaryProps) {
  if (reviews.length === 0) return null

  const distribution = buildDistribution(reviews)
  const avg =
    averageRating ??
    reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, reviews.length)

  return (
    <div className={cn('flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center', className)}>
      <div className="flex shrink-0 flex-col items-center gap-1 sm:w-36">
        <span className="text-4xl font-bold text-primary">{avg.toFixed(1)}</span>
        <RatingStars rating={avg} />
        <span className="text-xs text-muted-foreground">{reviews.length} đánh giá</span>
      </div>

      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star]
          const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-muted-foreground">{star} ★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-muted-foreground">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}