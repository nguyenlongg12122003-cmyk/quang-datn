import { ProductImageList } from '@/features/admin/ProductImageList'
import type { ProductFormState } from '@/features/admin/product-form-utils'

interface ProductFormMediaTabProps {
  form: ProductFormState
  onPatch: (patch: Partial<ProductFormState>) => void
}

export function ProductFormMediaTab({ form, onPatch }: ProductFormMediaTabProps) {
  return (
    <ProductImageList
      values={form.imageUrls}
      onChange={(imageUrls) => onPatch({ imageUrls })}
    />
  )
}