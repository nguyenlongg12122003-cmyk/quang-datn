import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/common/ProductCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCarouselProps {
  products: Product[]
  loading?: boolean
  skeletonCount?: number
  className?: string
}

export function ProductCarousel({
  products,
  loading,
  skeletonCount = 5,
  className,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, products.length, loading])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector('[data-carousel-item]')?.clientWidth ?? 200
    const gap = 12
    const amount = (cardWidth + gap) * 2
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className={cn('relative', className)}>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              data-carousel-item
              className="w-[calc(50%-6px)] shrink-0 space-y-2 sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-9.6px)]"
            >
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  return (
    <div className={cn('group/carousel relative', className)}>
      {canScrollLeft ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute -left-3 top-[38%] z-10 hidden size-9 rounded-full bg-background shadow-md lg:flex"
          onClick={() => scroll('left')}
          aria-label="Cuộn trái"
        >
          <ChevronLeft className="size-5" />
        </Button>
      ) : null}
      {canScrollRight ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute -right-3 top-[38%] z-10 hidden size-9 rounded-full bg-background shadow-md lg:flex"
          onClick={() => scroll('right')}
          aria-label="Cuộn phải"
        >
          <ChevronRight className="size-5" />
        </Button>
      ) : null}

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            data-carousel-item
            className="w-[calc(50%-6px)] shrink-0 snap-start sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-9.6px)]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  )
}