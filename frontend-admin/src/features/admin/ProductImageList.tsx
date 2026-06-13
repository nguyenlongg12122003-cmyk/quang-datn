import { useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ImageUploader } from '@/components/common/ImageUploader'

interface ProductImageListProps {
  values: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ProductImageList({ values, onChange, maxImages = 8 }: ProductImageListProps) {
  const [adding, setAdding] = useState(false)
  const canAdd = values.length < maxImages

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const updateAt = (index: number, url: string) => {
    if (!url) {
      removeAt(index)
      return
    }
    onChange(values.map((v, i) => (i === index ? url : v)))
  }

  const setAsPrimary = (index: number) => {
    if (index === 0) return
    const next = [...values]
    const [picked] = next.splice(index, 1)
    next.unshift(picked)
    onChange(next)
  }

  const appendImage = (url: string) => {
    if (!url) return
    onChange([...values, url])
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      {values.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">Chưa có ảnh sản phẩm.</p>
      ) : null}

      {values.map((url, index) => (
        <div key={`${url}-${index}`} className="space-y-2 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">
              {index === 0 ? 'Ảnh chính' : `Ảnh phụ ${index}`}
            </Label>
            <div className="flex items-center gap-1">
              {index > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setAsPrimary(index)}
                >
                  <Star className="size-3.5" />
                  Ảnh chính
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => removeAt(index)}
                aria-label={`Xóa ảnh ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <ImageUploader
            value={url}
            onChange={(newUrl) => updateAt(index, newUrl)}
            hint={index === 0 ? 'Ảnh đầu tiên hiển thị trên cửa hàng.' : undefined}
          />
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-lg border border-dashed p-4">
          <Label className="text-sm font-medium">Tải ảnh mới</Label>
          <ImageUploader
            value=""
            onChange={appendImage}
            hint="Mỗi lần chỉ chọn một ảnh từ thiết bị."
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Hủy
          </Button>
        </div>
      ) : canAdd ? (
        <Button type="button" variant="outline" className="gap-2" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Thêm ảnh ({values.length}/{maxImages})
        </Button>
      ) : null}

      {values.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Ảnh chính là ảnh đầu tiên trong danh sách. Mỗi lần bấm &quot;Thêm ảnh&quot; chỉ tải được một file.
        </p>
      ) : null}
    </div>
  )
}