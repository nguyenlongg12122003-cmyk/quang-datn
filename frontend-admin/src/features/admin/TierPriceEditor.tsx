import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/common/CurrencyInput'
import { formatCurrency } from '@/lib/format'
import {
  getTierPreview,
  getTierRowWarnings,
  type WholesaleRow,
} from '@/features/admin/product-form-utils'

interface TierPriceEditorProps {
  tiers: WholesaleRow[]
  basePrice: number | null
  emptyText: string
  addLabel: string
  onAdd: () => void
  onUpdate: (index: number, patch: Partial<WholesaleRow>) => void
  onRemove: (index: number) => void
}

export function TierPriceEditor({
  tiers,
  basePrice,
  emptyText,
  addLabel,
  onAdd,
  onUpdate,
  onRemove,
}: TierPriceEditorProps) {
  const warnings = getTierRowWarnings(tiers, basePrice)
  const warningByIndex = new Map(warnings.map((w) => [w.index, w.message]))
  const previewQty = 100
  const previewPrice =
    basePrice != null ? getTierPreview(tiers, previewQty, basePrice) : null

  return (
    <div className="space-y-3">
      <DynamicTable
        headers={['SL tối thiểu', 'Giá / sản phẩm', '']}
        columns="minmax(0,140px) 1fr 40px"
        emptyText={emptyText}
        isEmpty={tiers.length === 0}
      >
        {tiers.map((tier, index) => (
          <DynamicTableRow key={index} columns="minmax(0,140px) 1fr 40px">
            <div className="space-y-1">
              <Input
                type="number"
                min={1}
                value={tier.minQty}
                onChange={(e) => onUpdate(index, { minQty: e.target.value })}
                placeholder="50"
              />
              {warningByIndex.get(index) ? (
                <p className="text-[11px] text-amber-600">{warningByIndex.get(index)}</p>
              ) : null}
            </div>
            <CurrencyInput
              value={tier.price}
              onChange={(price) => onUpdate(index, { price })}
              placeholder="45000"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => onRemove(index)}
              aria-label="Xóa bậc giá"
            >
              <Trash2 className="size-4" />
            </Button>
          </DynamicTableRow>
        ))}
      </DynamicTable>

      {previewPrice != null && tiers.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Gợi ý: mua <span className="font-medium text-foreground">{previewQty}</span> sp → khách thấy{' '}
          <span className="font-medium text-primary">{formatCurrency(previewPrice)}</span>/sp
        </p>
      ) : null}

      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onAdd}>
        <Plus className="size-4" /> {addLabel}
      </Button>
    </div>
  )
}

function DynamicTable({
  headers,
  columns = '1fr 1fr 40px',
  emptyText,
  isEmpty,
  children,
}: {
  headers: string[]
  columns?: string
  emptyText: string
  isEmpty: boolean
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className="grid gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: columns }}
      >
        {headers.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      {isEmpty ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="divide-y">{children}</div>
      )}
    </div>
  )
}

function DynamicTableRow({
  columns,
  children,
}: {
  columns: string
  children: React.ReactNode
}) {
  return (
    <div
      className="grid items-center gap-3 px-3 py-2"
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  )
}