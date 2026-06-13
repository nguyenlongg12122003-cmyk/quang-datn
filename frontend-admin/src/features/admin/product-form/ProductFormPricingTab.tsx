import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { CurrencyInput } from '@/components/common/CurrencyInput'
import { TierPriceEditor } from '@/features/admin/TierPriceEditor'
import { DynamicTable, DynamicTableRow } from '@/features/admin/product-form/DynamicTable'
import { FormField } from '@/features/admin/product-form/FormField'
import {
  getPriceHints,
  TIER_TAB_META,
  type ProductFormFieldErrors,
  type ProductFormState,
  type TierTab,
} from '@/features/admin/product-form-utils'
import { getStockStatus, STOCK_STATUS_LABELS } from '@/lib/product'

interface TierHandlers {
  onAdd: () => void
  onUpdate: (index: number, patch: { minQty?: string; price?: string }) => void
  onRemove: (index: number) => void
}

interface PackagingHandlers {
  add: () => void
  update: (index: number, patch: { label?: string; qtyPerUnit?: string; price?: string }) => void
  remove: (index: number) => void
}

interface ProductFormPricingTabProps {
  form: ProductFormState
  errors: ProductFormFieldErrors
  tierTab: TierTab
  onTierTabChange: (tab: TierTab) => void
  onPatch: (patch: Partial<ProductFormState>) => void
  tierHandlers: {
    public: TierHandlers
    wholesale: TierHandlers
    enterprise: TierHandlers
  }
  packaging: PackagingHandlers
}

export function ProductFormPricingTab({
  form,
  errors,
  tierTab,
  onTierTabChange,
  onPatch,
  tierHandlers,
  packaging,
}: ProductFormPricingTabProps) {
  const priceHints = getPriceHints(form)
  const basePrice = Number(form.price)
  const parsedBasePrice = Number.isFinite(basePrice) ? basePrice : null
  const stockStatus = getStockStatus(Number(form.stock) || 0, Number(form.lowStockThreshold) || 10)
  const tierMeta = TIER_TAB_META[tierTab]

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Giá & tồn kho</h3>
          <p className="text-sm text-muted-foreground">Giá hiển thị và số lượng có sẵn.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Giá bán" data-field="price" error={errors.price} required>
            <CurrencyInput
              value={form.price}
              onChange={(price) => onPatch({ price })}
              aria-invalid={Boolean(errors.price)}
            />
          </FormField>
          <FormField
            label="Giá gốc"
            data-field="originalPrice"
            error={errors.originalPrice}
            required
          >
            <CurrencyInput
              value={form.originalPrice}
              onChange={(originalPrice) => onPatch({ originalPrice })}
              aria-invalid={Boolean(errors.originalPrice)}
            />
          </FormField>
          <FormField label="Tồn kho">
            <div className="space-y-2">
              <Input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => onPatch({ stock: e.target.value })}
                placeholder="0"
              />
              <Badge
                variant={
                  stockStatus === 'out'
                    ? 'destructive'
                    : stockStatus === 'low'
                      ? 'outline'
                      : 'secondary'
                }
                className="font-normal"
              >
                {STOCK_STATUS_LABELS[stockStatus]}
              </Badge>
            </div>
          </FormField>
        </div>

        {priceHints.discountPercent > 0 ? (
          <p className="text-sm text-commerce">Giảm {priceHints.discountPercent}% so với giá gốc</p>
        ) : null}

        {priceHints.warnings.length > 0 ? (
          <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            {priceHints.warnings.map((warning) => (
              <p
                key={warning}
                className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {warning}
              </p>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Barcode">
            <Input
              value={form.barcode}
              onChange={(e) => onPatch({ barcode: e.target.value })}
              placeholder="893xxxx"
            />
          </FormField>
          <FormField label="Ngưỡng tồn thấp">
            <Input
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) => onPatch({ lowStockThreshold: e.target.value })}
            />
          </FormField>
          <FormField label="Ngày giao (SP tùy chỉnh)">
            <Input
              type="number"
              min={1}
              value={form.customizationLeadDays}
              onChange={(e) => onPatch({ customizationLeadDays: e.target.value })}
            />
          </FormField>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Bảng giá theo số lượng</h3>
          <p className="text-sm text-muted-foreground">
            Tách giá lẻ bulk, giá sỉ B2B và giá đại lý B2B.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['public', 'wholesale', 'enterprise'] as const).map((tab) => {
            const count =
              tab === 'public'
                ? form.publicBulkTiers.length
                : tab === 'wholesale'
                  ? form.wholesaleTiers.length
                  : form.enterpriseTiers.length
            return (
              <Button
                key={tab}
                type="button"
                size="sm"
                variant={tierTab === tab ? 'default' : 'outline'}
                onClick={() => onTierTabChange(tab)}
              >
                {TIER_TAB_META[tab].label}
                {count > 0 ? (
                  <Badge variant="secondary" className="ml-2">
                    {count}
                  </Badge>
                ) : null}
              </Button>
            )
          })}
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{tierMeta.audience}</p>
          <p className="mt-0.5">{tierMeta.storage}</p>
        </div>
        {tierTab === 'public' ? (
          <TierPriceEditor
            tiers={form.publicBulkTiers}
            basePrice={parsedBasePrice}
            emptyText="Chưa có bậc giá bulk cho khách lẻ."
            addLabel="Thêm bậc giá lẻ (bulk)"
            {...tierHandlers.public}
          />
        ) : null}
        {tierTab === 'wholesale' ? (
          <TierPriceEditor
            tiers={form.wholesaleTiers}
            basePrice={parsedBasePrice}
            emptyText="Chưa có bậc giá sỉ B2B."
            addLabel="Thêm bậc giá sỉ B2B"
            {...tierHandlers.wholesale}
          />
        ) : null}
        {tierTab === 'enterprise' ? (
          <TierPriceEditor
            tiers={form.enterpriseTiers}
            basePrice={parsedBasePrice}
            emptyText="Chưa có bậc giá đại lý B2B."
            addLabel="Thêm bậc giá đại lý B2B"
            {...tierHandlers.enterprise}
          />
        ) : null}
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Quy cách đóng gói</h3>
          <p className="text-sm text-muted-foreground">Bán theo hộp, thùng, lốc…</p>
        </div>
        <DynamicTable
          headers={['Tên quy cách', 'SL / quy cách', 'Giá / quy cách (tùy chọn)', '']}
          columns="1fr 140px 1fr 40px"
          emptyText="Chưa có quy cách đóng gói."
          isEmpty={form.packagingUnits.length === 0}
        >
          {form.packagingUnits.map((row, index) => (
            <DynamicTableRow key={index} columns="1fr 140px 1fr 40px">
              <Input
                value={row.label}
                onChange={(e) => packaging.update(index, { label: e.target.value })}
                placeholder="Hộp"
              />
              <Input
                type="number"
                min={1}
                value={row.qtyPerUnit}
                onChange={(e) => packaging.update(index, { qtyPerUnit: e.target.value })}
                placeholder="12"
              />
              <CurrencyInput
                value={row.price}
                onChange={(price) => packaging.update(index, { price })}
                placeholder="để trống = tính theo giá lẻ/sỉ"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => packaging.remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </DynamicTableRow>
          ))}
        </DynamicTable>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={packaging.add}>
          <Plus className="size-4" /> Thêm quy cách
        </Button>
      </section>
    </div>
  )
}