import { useState } from 'react'
import { GripVertical, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/common/ImageUploader'
import { cn } from '@/lib/utils'

interface MultiImageUploaderProps {
  values: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  className?: string
}

export function MultiImageUploader({
  values,
  onChange,
  maxImages = 8,
  className,
}: MultiImageUploaderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const canAdd = values.length < maxImages

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const addImage = (url: string) => {
    if (!url || values.length >= maxImages) return
    onChange([...values, url])
  }

  const setAsPrimary = (index: number) => {
    if (index === 0) return
    const next = [...values]
    const [picked] = next.splice(index, 1)
    next.unshift(picked)
    onChange(next)
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const next = [...values]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const onDragStart = (index: number) => setDragIndex(index)

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const onDrop = (index: number) => {
    if (dragIndex != null) reorder(dragIndex, index)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const onDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {values.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {values.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={() => onDrop(index)}
              onDragEnd={onDragEnd}
              className={cn(
                'group relative overflow-hidden rounded-lg border bg-muted transition-shadow',
                index === 0 ? 'col-span-2 aspect-[4/3] sm:aspect-[5/4]' : 'aspect-square',
                dragIndex === index && 'opacity-50',
                dragOverIndex === index && dragIndex !== index && 'ring-2 ring-primary ring-offset-2',
              )}
            >
              <img src={url} alt={`Ảnh ${index + 1}`} className="size-full object-cover" />

              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  <GripVertical className="size-3" />
                  Kéo để sắp xếp
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  onClick={() => removeAt(index)}
                  aria-label={`Xóa ảnh ${index + 1}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>

              {index === 0 ? (
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                  <Star className="size-3 fill-current" />
                  Ảnh chính
                </span>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setAsPrimary(index)}
                >
                  <Star className="size-3" />
                  Đặt làm ảnh chính
                </Button>
              )}
            </div>
          ))}

          {canAdd ? (
            <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/30 p-3">
              <ImageUploader value="" onChange={addImage} compact hint="" />
              <p className="text-center text-xs text-muted-foreground">
                Thêm ảnh
                <br />
                {values.length}/{maxImages}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <ImageUploader
          value=""
          onChange={addImage}
          hint={`Tối đa ${maxImages} ảnh. Ảnh đầu tiên hiển thị làm ảnh đại diện.`}
        />
      )}

      {values.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Kéo thả để đổi thứ tự. Ảnh đầu tiên là ảnh đại diện trên cửa hàng.
        </p>
      ) : null}
    </div>
  )
}