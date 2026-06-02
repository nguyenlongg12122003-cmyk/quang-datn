import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { useBrands, useCategories } from '@/features/catalog/api'

export interface FilterState {
  categorySlug?: string
  brandId?: string
  isFlashSale?: boolean
  isCustomizable?: boolean
  hasWholesale?: boolean
}

interface ProductFiltersProps {
  value: FilterState
  onChange: (next: FilterState) => void
}

export function ProductFilters({ value, onChange }: ProductFiltersProps) {
  const { data: categories = [] } = useCategories()
  const { data: brands = [] } = useBrands()

  const patch = (p: Partial<FilterState>) => onChange({ ...value, ...p })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Bộ lọc</h3>
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Xóa lọc
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Danh mục</Label>
        <RadioGroup
          value={value.categorySlug ?? ''}
          onValueChange={(v) => patch({ categorySlug: v || undefined })}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="" /> Tất cả
          </label>
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={c.slug} /> {c.name}
            </label>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Thương hiệu</Label>
        <RadioGroup
          value={value.brandId ?? ''}
          onValueChange={(v) => patch({ brandId: v || undefined })}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="" /> Tất cả
          </label>
          {brands.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={b.id} /> {b.name}
            </label>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Đặc điểm</Label>
        {[
          { key: 'isFlashSale' as const, label: 'Đang Flash Sale' },
          { key: 'isCustomizable' as const, label: 'Có thể tùy chỉnh in' },
          { key: 'hasWholesale' as const, label: 'Có giá sỉ' },
        ].map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(value[f.key])}
              onCheckedChange={(c) => patch({ [f.key]: c === true ? true : undefined })}
            />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  )
}
