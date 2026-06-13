import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/common/CurrencyInput'
import { FlashSaleCountdown } from '@/features/admin/FlashSaleCountdown'
import { DynamicTable, DynamicTableRow } from '@/features/admin/product-form/DynamicTable'
import { FormField } from '@/features/admin/product-form/FormField'
import type { ProductFormFieldErrors, ProductFormState } from '@/features/admin/product-form-utils'

interface ProductFormAdvancedTabProps {
  form: ProductFormState
  errors: ProductFormFieldErrors
  onPatch: (patch: Partial<ProductFormState>) => void
  onSetCustomizable: (val: boolean) => void
  specs: {
    add: () => void
    update: (index: number, patch: { key?: string; value?: string }) => void
    remove: (index: number) => void
  }
  customization: {
    add: () => void
    update: (
      index: number,
      patch: Partial<{
        label: string
        inputType: 'text' | 'image'
        extraPrice: number
        placeholder: string
        helpText: string
      }>,
    ) => void
    remove: (index: number) => void
  }
}

export function ProductFormAdvancedTab({
  form,
  errors,
  onPatch,
  onSetCustomizable,
  specs,
  customization,
}: ProductFormAdvancedTabProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Thông số kỹ thuật</h3>
          <p className="text-sm text-muted-foreground">Kích thước, chất liệu và thuộc tính chi tiết.</p>
        </div>
        <DynamicTable
          headers={['Tên thông số', 'Giá trị', '']}
          columns="1fr 1fr 40px"
          emptyText="Chưa có thông số."
          isEmpty={form.specifications.length === 0}
        >
          {form.specifications.map((row, index) => (
            <DynamicTableRow key={index} columns="1fr 1fr 40px">
              <Input
                value={row.key}
                onChange={(e) => specs.update(index, { key: e.target.value })}
                placeholder="Kích thước"
              />
              <Input
                value={row.value}
                onChange={(e) => specs.update(index, { value: e.target.value })}
                placeholder="A4"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => specs.remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </DynamicTableRow>
          ))}
        </DynamicTable>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={specs.add}>
          <Plus className="size-4" /> Thêm thông số
        </Button>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Khuyến mãi</h3>
          <p className="text-sm text-muted-foreground">Cấu hình Flash Sale cho sản phẩm.</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isFlashSale}
              onCheckedChange={(checked) => onPatch({ isFlashSale: checked })}
              id="flashsale"
            />
            <Label htmlFor="flashsale" className="cursor-pointer font-medium">
              Bật Flash Sale
            </Label>
          </div>
        </div>
        {form.isFlashSale ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Giá khuyến mãi"
              data-field="flashSalePrice"
              error={errors.flashSalePrice}
            >
              <CurrencyInput
                value={form.flashSalePrice}
                onChange={(flashSalePrice) => onPatch({ flashSalePrice })}
                aria-invalid={Boolean(errors.flashSalePrice)}
              />
            </FormField>
            <FormField label="Thời gian kết thúc">
              <Input
                type="datetime-local"
                value={form.flashSaleEnd}
                onChange={(e) => onPatch({ flashSaleEnd: e.target.value })}
              />
              {form.flashSaleEnd ? (
                <FlashSaleCountdown endAt={new Date(form.flashSaleEnd).toISOString()} />
              ) : null}
            </FormField>
          </div>
        ) : null}
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Tùy chỉnh in ấn</h3>
          <p className="text-sm text-muted-foreground">Cho phép khách tùy chỉnh nội dung in.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
          <Switch
            checked={form.isCustomizable}
            onCheckedChange={onSetCustomizable}
            id="customizable"
          />
          <Label htmlFor="customizable" className="cursor-pointer font-medium">
            Cho phép tùy chỉnh in
          </Label>
        </div>
        {form.isCustomizable ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Tùy chọn in ấn</p>
              <Button type="button" size="sm" variant="outline" onClick={customization.add}>
                <Plus className="size-4" /> Thêm
              </Button>
            </div>
            {form.customizationOptions.map((opt, idx) => (
              <div key={idx} className="space-y-3 rounded-lg border p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_110px_100px_40px] sm:items-end">
                  <FormField label="Tên tùy chọn">
                    <Input
                      value={opt.label || ''}
                      onChange={(e) => customization.update(idx, { label: e.target.value })}
                      placeholder="In tên / In logo"
                    />
                  </FormField>
                  <FormField label="Loại">
                    <Select
                      value={opt.inputType || 'text'}
                      onValueChange={(v: 'text' | 'image') =>
                        customization.update(idx, { inputType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="image">Ảnh</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Giá +">
                    <CurrencyInput
                      value={String(opt.extraPrice ?? 0)}
                      onChange={(v) =>
                        customization.update(idx, { extraPrice: Number(v) || 0 })
                      }
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive sm:mb-0.5"
                    onClick={() => customization.remove(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={opt.placeholder || ''}
                    onChange={(e) =>
                      customization.update(idx, {
                        placeholder: e.target.value || undefined,
                      })
                    }
                    placeholder="Placeholder (tùy chọn)"
                    className="text-sm"
                  />
                  <Input
                    value={opt.helpText || ''}
                    onChange={(e) =>
                      customization.update(idx, { helpText: e.target.value || undefined })
                    }
                    placeholder="Hướng dẫn (tùy chọn)"
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}