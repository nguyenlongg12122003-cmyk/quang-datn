import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ChipInput } from '@/components/common/ChipInput'
import { ColorChipInput } from '@/features/admin/ColorChipInput'
import { FormField } from '@/features/admin/product-form/FormField'
import type { ProductFormFieldErrors, ProductFormState } from '@/features/admin/product-form-utils'
import { slugify } from '@/lib/utils'

interface ProductFormGeneralTabProps {
  form: ProductFormState
  errors: ProductFormFieldErrors
  slugTouched: boolean
  onPatch: (patch: Partial<ProductFormState>) => void
  onSlugTouched: () => void
  onRegenerateSlug: () => void
}

export function ProductFormGeneralTab({
  form,
  errors,
  slugTouched,
  onPatch,
  onSlugTouched,
  onRegenerateSlug,
}: ProductFormGeneralTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Tên sản phẩm"
          className="sm:col-span-2"
          data-field="name"
          error={errors.name}
          required
        >
          <Input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value
              const patch: Partial<ProductFormState> = { name }
              if (!slugTouched && name) patch.slug = slugify(name)
              onPatch(patch)
            }}
            placeholder="Tên sản phẩm"
            aria-invalid={Boolean(errors.name)}
          />
        </FormField>

        <FormField label="SKU" data-field="sku" error={errors.sku} required>
          <Input
            value={form.sku}
            onChange={(e) => onPatch({ sku: e.target.value })}
            placeholder="SKU-001"
            aria-invalid={Boolean(errors.sku)}
          />
        </FormField>

        <FormField
          label="Slug URL"
          description="Đường dẫn thân thiện SEO trên cửa hàng."
        >
          <div className="flex gap-2">
            <Input
              value={form.slug}
              onChange={(e) => {
                onSlugTouched()
                onPatch({ slug: e.target.value })
              }}
              placeholder="tự động từ tên"
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRegenerateSlug}
              aria-label="Tự sinh slug từ tên"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </FormField>
      </div>

      <Separator />

      <FormField label="Mô tả">
        <Textarea
          value={form.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="Mô tả ngắn gọn về sản phẩm…"
          className="min-h-[160px] resize-y"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tags">
          <ChipInput
            value={form.tags}
            onChange={(tags) => onPatch({ tags })}
            placeholder="văn phòng, quà tặng…"
          />
        </FormField>
        <FormField label="Màu sắc">
          <ColorChipInput value={form.colors} onChange={(colors) => onPatch({ colors })} />
        </FormField>
      </div>
    </div>
  )
}