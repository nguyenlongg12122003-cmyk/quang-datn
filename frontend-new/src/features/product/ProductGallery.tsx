import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types'

interface ProductGalleryProps {
  images: ProductImage[]
  name: string
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const current = images[active]

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        {current ? (
          <img src={current.url} alt={current.alt ?? name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">Không có ảnh</div>
        )}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                i === active ? 'border-primary' : 'border-transparent',
              )}
            >
              <img src={img.url} alt={img.alt ?? name} className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
