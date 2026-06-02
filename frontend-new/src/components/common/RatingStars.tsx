import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  rating: number
  size?: number
  className?: string
}

export function RatingStars({ rating, size = 14, className }: RatingStarsProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${rating} sao`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(rating)
        return (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              filled ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40',
            )}
          />
        )
      })}
    </div>
  )
}
