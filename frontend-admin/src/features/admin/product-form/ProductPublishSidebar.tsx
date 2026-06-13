import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/features/admin/product-form/FormField'
import type { Category, Brand, Product } from '@/types'
import type { ProductFormFieldErrors, ProductFormState } from '@/features/admin/product-form-utils'

const STATUS_HINT: Record<Product['status'], string> = {
  active: 'Sản phẩm hiển thị trên cửa hàng.',
  draft: 'Chỉ lưu nội bộ, khách chưa thấy.',
  inactive: 'Ẩn khỏi cửa hàng.',
}

interface ProductPublishSidebarProps {
  form: ProductFormState
  errors: ProductFormFieldErrors
  categories: Category[]
  brands: Brand[]
  onPatch: (patch: Partial<ProductFormState>) => void
}

export function ProductPublishSidebar({
  form,
  errors,
  categories,
  brands,
  onPatch,
}: ProductPublishSidebarProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Xuất bản</CardTitle>
        <CardDescription>Trạng thái và phân loại sản phẩm</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Trạng thái" description={STATUS_HINT[form.status]}>
          <Select
            value={form.status}
            onValueChange={(v) => onPatch({ status: v as Product['status'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Đang bán</SelectItem>
              <SelectItem value="draft">Nháp</SelectItem>
              <SelectItem value="inactive">Ngừng bán</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <Separator />

        <FormField
          label="Danh mục"
          data-field="categoryId"
          error={errors.categoryId}
          required
        >
          <Select value={form.categoryId} onValueChange={(v) => onPatch({ categoryId: v })}>
            <SelectTrigger aria-invalid={Boolean(errors.categoryId)}>
              <SelectValue placeholder="Chọn danh mục" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Thương hiệu" data-field="brandId" error={errors.brandId} required>
          <Select value={form.brandId} onValueChange={(v) => onPatch({ brandId: v })}>
            <SelectTrigger aria-invalid={Boolean(errors.brandId)}>
              <SelectValue placeholder="Chọn thương hiệu" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  )
}