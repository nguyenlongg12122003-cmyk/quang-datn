import { useId, useRef, useState } from 'react'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  ACCEPTED_IMAGE_ACCEPT_ATTR,
  isCloudinaryConfigured,
  uploadImageToCloudinary,
  validateImageFile,
} from '@/lib/cloudinary'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  className?: string
  /** Sizing/shape for the preview box, e.g. "size-24 rounded-full" for avatars. */
  previewClassName?: string
  /** Helper text under the drop zone. */
  hint?: string
}

export function ImageUploader({
  value,
  onChange,
  disabled,
  className,
  previewClassName,
  hint,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const configured = isCloudinaryConfigured()
  const isBusy = disabled || uploading

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setUploading(true)
    try {
      const url = await uploadImageToCloudinary(file)
      onChange(url)
      toast.success('Đã tải ảnh lên')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tải ảnh lên thất bại')
    } finally {
      setUploading(false)
      // Allow re-selecting the same file after a remove/replace.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const openPicker = () => {
    if (isBusy) return
    inputRef.current?.click()
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (isBusy) return
    void handleFile(e.dataTransfer.files?.[0])
  }

  if (!configured) {
    return (
      <div
        className={cn(
          'rounded-md border border-dashed border-destructive/50 bg-destructive/5 p-3 text-sm text-muted-foreground',
          className,
        )}
      >
        Cloudinary chưa được cấu hình. Thêm <code>VITE_CLOUDINARY_CLOUD_NAME</code> và{' '}
        <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> vào file <code>.env</code> rồi khởi động lại dev server.
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
        className="sr-only"
        disabled={isBusy}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'relative shrink-0 overflow-hidden rounded-md border border-border bg-muted',
              previewClassName ?? 'size-24',
            )}
          >
            <img src={value} alt="Ảnh đã tải lên" className="size-full object-cover" />
            {uploading ? (
              <div className="absolute inset-0 grid place-items-center bg-background/60">
                <Loader2 className="size-5 animate-spin text-foreground" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={isBusy}>
              <Upload className="size-4" />
              Thay ảnh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onChange('')}
              disabled={isBusy}
            >
              <Trash2 className="size-4" />
              Xóa
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isBusy) setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          disabled={isBusy}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-transparent px-4 py-6 text-sm text-muted-foreground transition-colors',
            'hover:border-ring hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60',
            dragActive && 'border-ring bg-accent/60',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" />
              <span>Đang tải lên…</span>
            </>
          ) : (
            <>
              <ImageIcon className="size-6" />
              <span>
                <span className="font-medium text-foreground">Nhấn để tải ảnh</span> hoặc kéo thả vào đây
              </span>
              <span className="text-xs">JPEG, PNG, WebP, GIF · tối đa 5MB</span>
            </>
          )}
        </button>
      )}

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
