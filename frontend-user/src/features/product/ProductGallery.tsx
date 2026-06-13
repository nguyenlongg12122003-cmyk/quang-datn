import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, ZoomIn } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types'

interface ProductGalleryProps {
  images: ProductImage[]
  name: string
  discountPercent?: number
  showFlashSale?: boolean
  outOfStock?: boolean
}

export function ProductGallery({
  images,
  name,
  discountPercent = 0,
  showFlashSale = false,
  outOfStock = false,
}: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const current = images[active]

  const goTo = useCallback(
    (index: number) => {
      if (images.length === 0) return
      setActive((index + images.length) % images.length)
    },
    [images.length],
  )

  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(active - 1)
      if (e.key === 'ArrowRight') goTo(active + 1)
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen, active, goTo])

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => current && setLightboxOpen(true)}
          className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted"
          aria-label="Phóng to ảnh sản phẩm"
        >
          {current ? (
            <>
              <img
                src={current.url}
                alt={current.alt ?? name}
                className="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <span className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <ZoomIn className="size-4 text-muted-foreground" />
              </span>
            </>
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">Không có ảnh</div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
            {showFlashSale ? (
              <Badge className="gap-1 bg-commerce text-commerce-foreground hover:bg-commerce/90">
                <Sparkles className="size-3" /> Flash Sale
              </Badge>
            ) : null}
            {discountPercent > 0 ? (
              <Badge className="bg-commerce text-commerce-foreground hover:bg-commerce/90">
                -{discountPercent}%
              </Badge>
            ) : null}
            {outOfStock ? (
              <Badge variant="secondary" className="bg-background/90 text-destructive">
                Hết hàng
              </Badge>
            ) : null}
          </div>
        </button>

        {images.length > 1 ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 size-8 -translate-y-1/2 rounded-full bg-background/90 shadow-sm"
              onClick={() => goTo(active - 1)}
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full bg-background/90 shadow-sm"
              onClick={() => goTo(active + 1)}
              aria-label="Ảnh sau"
            >
              <ChevronRight className="size-4" />
            </Button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors',
                i === active ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              <img src={img.url} alt={img.alt ?? name} className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton
          className="flex h-[min(90vh,800px)] max-w-[min(96vw,960px)] items-center justify-center border-none bg-black/95 p-2 sm:p-4"
        >
          <DialogTitle className="sr-only">{name}</DialogTitle>
          {current ? (
            <img
              src={current.url}
              alt={current.alt ?? name}
              className="max-h-full max-w-full object-contain"
            />
          ) : null}
          {images.length > 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-3 top-1/2 size-10 -translate-y-1/2 rounded-full border-white/20 bg-black/50 text-white hover:bg-black/70"
                onClick={() => goTo(active - 1)}
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-3 top-1/2 size-10 -translate-y-1/2 rounded-full border-white/20 bg-black/50 text-white hover:bg-black/70"
                onClick={() => goTo(active + 1)}
                aria-label="Ảnh sau"
              >
                <ChevronRight className="size-5" />
              </Button>
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70">
                {active + 1} / {images.length}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}