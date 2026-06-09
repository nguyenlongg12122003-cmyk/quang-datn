import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChipInput } from '@/components/common/ChipInput'
import { CurrencyInput } from '@/components/common/CurrencyInput'
import { MultiImageUploader } from '@/components/common/MultiImageUploader'
import { useBrands, useCategories } from '@/features/catalog/api'
import { useCreateProduct, useUpdateProduct } from '@/features/admin/api'
import {
  buildProductFormState,
  buildProductPayload,
  getProductFormFieldErrors,
  PRODUCT_FORM_SECTIONS,
  validateProductForm,
  type ProductFormFieldErrors,
  type ProductFormState,
  type SpecRow,
  type WholesaleRow,
  type PackagingRow,
} from '@/features/admin/product-form-utils'
import { useScrollSpy } from '@/hooks/use-scroll-spy'
import { getErrorMessage } from '@/lib/api/axios'
import { formatCurrency } from '@/lib/format'
import { getStockStatus, STOCK_STATUS_LABELS } from '@/lib/product'
import { cn, slugify } from '@/lib/utils'
import type { CustomizationOption, Product } from '@/types'

const STORE_URL = import.meta.env.VITE_STORE_URL ?? 'http://localhost:5173'

const STATUS_OPTIONS: Array<{
  value: Product['status']
  label: string
  description: string
  activeClass: string
}> = [
  {
    value: 'active',
    label: 'Đang bán',
    description: 'Hiển thị trên cửa hàng',
    activeClass: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  {
    value: 'draft',
    label: 'Nháp',
    description: 'Chỉ lưu nội bộ',
    activeClass: 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  {
    value: 'inactive',
    label: 'Ngừng bán',
    description: 'Ẩn khỏi cửa hàng',
    activeClass: 'border-muted-foreground/40 bg-muted text-muted-foreground',
  },
]

interface ProductFormProps {
  product: Product | null
  onSuccess: () => void
  onCancel: () => void
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { data: categories = [] } = useCategories()
  const { data: brands = [] } = useBrands()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const [form, setForm] = useState<ProductFormState>(() => buildProductFormState(product))
  const [errors, setErrors] = useState<ProductFormFieldErrors>({})
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug))

  const set = (patch: Partial<ProductFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    const cleared = Object.keys(patch).filter(
      (key) => key in errors,
    ) as Array<keyof ProductFormFieldErrors>
    if (cleared.length > 0) {
      setErrors((prev) => {
        const next = { ...prev }
        for (const key of cleared) delete next[key]
        return next
      })
    }
  }

  const pending = createProduct.isPending || updateProduct.isPending
  const activeSection = useScrollSpy(PRODUCT_FORM_SECTIONS.map((s) => s.id))

  const submit = useCallback(() => {
    const fieldErrors = getProductFormFieldErrors(form)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      toast.error(validateProductForm(form) ?? 'Vui lòng kiểm tra các trường được đánh dấu')
      const firstId = Object.keys(fieldErrors)[0]
      document
        .querySelector(`[data-field="${firstId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const payload = buildProductPayload(form)
    const onDone = {
      onSuccess: () => {
        toast.success(product ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm')
        onSuccess()
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }

    if (product) updateProduct.mutate({ id: product.id, payload }, onDone)
    else createProduct.mutate(payload, onDone)
  }, [form, onSuccess, product, createProduct, updateProduct])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [submit])

  const addCustomizationOption = () => {
    set({
      customizationOptions: [
        ...form.customizationOptions,
        { label: '', inputType: 'text', extraPrice: 0 },
      ],
    })
  }

  const updateCustomizationOption = (index: number, patch: Partial<CustomizationOption>) => {
    set({
      customizationOptions: form.customizationOptions.map((opt, i) =>
        i === index ? { ...opt, ...patch } : opt,
      ),
    })
  }

  const removeCustomizationOption = (index: number) => {
    set({ customizationOptions: form.customizationOptions.filter((_, i) => i !== index) })
  }

  const setIsCustomizable = (val: boolean) => {
    const patch: Partial<ProductFormState> = { isCustomizable: val }
    if (!val) patch.customizationOptions = []
    else if (form.customizationOptions.length === 0) {
      patch.customizationOptions = [{ label: '', inputType: 'text', extraPrice: 0 }]
    }
    set(patch)
  }

  const addSpecification = () => {
    set({ specifications: [...form.specifications, { key: '', value: '' }] })
  }

  const updateSpecification = (index: number, patch: Partial<SpecRow>) => {
    set({
      specifications: form.specifications.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    })
  }

  const removeSpecification = (index: number) => {
    set({ specifications: form.specifications.filter((_, i) => i !== index) })
  }

  const addWholesaleTier = () => {
    set({ wholesaleTiers: [...form.wholesaleTiers, { minQty: '', price: '' }] })
  }

  const updateWholesaleTier = (index: number, patch: Partial<WholesaleRow>) => {
    set({
      wholesaleTiers: form.wholesaleTiers.map((tier, i) =>
        i === index ? { ...tier, ...patch } : tier,
      ),
    })
  }

  const removeWholesaleTier = (index: number) => {
    set({ wholesaleTiers: form.wholesaleTiers.filter((_, i) => i !== index) })
  }

  const addEnterpriseTier = () => {
    set({ enterpriseTiers: [...form.enterpriseTiers, { minQty: '', price: '' }] })
  }

  const updateEnterpriseTier = (index: number, patch: Partial<WholesaleRow>) => {
    set({
      enterpriseTiers: form.enterpriseTiers.map((tier, i) =>
        i === index ? { ...tier, ...patch } : tier,
      ),
    })
  }

  const removeEnterpriseTier = (index: number) => {
    set({ enterpriseTiers: form.enterpriseTiers.filter((_, i) => i !== index) })
  }

  const addPackagingUnit = () => {
    set({ packagingUnits: [...form.packagingUnits, { label: '', qtyPerUnit: '', price: '' }] })
  }

  const updatePackagingUnit = (index: number, patch: Partial<PackagingRow>) => {
    set({
      packagingUnits: form.packagingUnits.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    })
  }

  const removePackagingUnit = (index: number) => {
    set({ packagingUnits: form.packagingUnits.filter((_, i) => i !== index) })
  }

  const regenerateSlug = () => {
    if (!form.name.trim()) {
      toast.error('Nhập tên sản phẩm trước')
      return
    }
    set({ slug: slugify(form.name) })
    setSlugTouched(true)
  }

  const stockStatus = getStockStatus(Number(form.stock) || 0, Number(form.lowStockThreshold) || 10)
  const previewPrice = form.price ? Number(form.price) : null
  const previewOriginal = form.originalPrice ? Number(form.originalPrice) : null
  const hasDiscount =
    previewPrice != null &&
    previewOriginal != null &&
    previewOriginal > previewPrice &&
    Number.isFinite(previewPrice) &&
    Number.isFinite(previewOriginal)
  const categoryName = categories.find((c) => c.id === form.categoryId)?.name
  const brandName = brands.find((b) => b.id === form.brandId)?.name
  const previewSlug = form.slug || (form.name ? slugify(form.name) : '')
  const storePreviewUrl =
    form.status === 'active' && previewSlug
      ? `${STORE_URL.replace(/\/$/, '')}/products/${previewSlug}`
      : null

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-30 -mx-4 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              aria-label="Quay lại danh sách"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {form.name.trim() || 'Chưa có tên'} {form.sku ? `· ${form.sku}` : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
              Hủy
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? 'Đang lưu…' : product ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <FormSection
            id="section-basic"
            title="Thông tin sản phẩm"
            description="Tên, mã và mô tả hiển thị trên cửa hàng"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
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
                    set(patch)
                  }}
                  placeholder="Tên sản phẩm"
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>
              <Field label="SKU" data-field="sku" error={errors.sku} required>
                <Input
                  value={form.sku}
                  onChange={(e) => set({ sku: e.target.value })}
                  placeholder="SKU-001"
                  aria-invalid={Boolean(errors.sku)}
                />
              </Field>
              <Field label="Slug URL">
                <div className="flex gap-2">
                  <Input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      set({ slug: e.target.value })
                    }}
                    placeholder="tự động từ tên"
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={regenerateSlug}
                    aria-label="Tự sinh slug từ tên"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
              </Field>
            </div>
            <Separator />
            <Field label="Mô tả">
              <Textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Mô tả ngắn gọn về sản phẩm…"
                className="min-h-[140px] resize-y"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tags">
                <ChipInput
                  value={form.tags}
                  onChange={(tags) => set({ tags })}
                  placeholder="văn phòng, quà tặng…"
                />
              </Field>
              <Field label="Màu sắc">
                <ChipInput
                  value={form.colors}
                  onChange={(colors) => set({ colors })}
                  placeholder="Đỏ, Xanh dương…"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection id="section-media" title="Hình ảnh" description="Ảnh đại diện và gallery sản phẩm">
            <MultiImageUploader values={form.imageUrls} onChange={(imageUrls) => set({ imageUrls })} />
          </FormSection>

          <FormSection id="section-pricing" title="Giá & tồn kho">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Giá bán" data-field="price" error={errors.price} required>
                <CurrencyInput
                  value={form.price}
                  onChange={(price) => set({ price })}
                  aria-invalid={Boolean(errors.price)}
                />
              </Field>
              <Field
                label="Giá gốc"
                data-field="originalPrice"
                error={errors.originalPrice}
                required
              >
                <CurrencyInput
                  value={form.originalPrice}
                  onChange={(originalPrice) => set({ originalPrice })}
                  aria-invalid={Boolean(errors.originalPrice)}
                />
              </Field>
              <Field label="Tồn kho">
                <div className="space-y-2">
                  <Input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) => set({ stock: e.target.value })}
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
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Barcode / mã quét">
                <Input value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} placeholder="893xxxx" />
              </Field>
              <Field label="Ngưỡng tồn thấp">
                <Input
                  type="number"
                  min={0}
                  value={form.lowStockThreshold}
                  onChange={(e) => set({ lowStockThreshold: e.target.value })}
                />
              </Field>
              <Field label="Ngày giao hàng (SP tùy chỉnh)">
                <Input
                  type="number"
                  min={1}
                  value={form.customizationLeadDays}
                  onChange={(e) => set({ customizationLeadDays: e.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          <CollapsibleSection
            id="section-wholesale"
            title="Giá sỉ theo số lượng"
            description="Bậc giá khi khách mua số lượng lớn"
            defaultOpen={form.wholesaleTiers.length > 0}
          >
            <DynamicTable
              headers={['Số lượng tối thiểu', 'Giá / sản phẩm', '']}
              columns="minmax(0,140px) 1fr 40px"
              emptyText="Chưa có bậc giá sỉ."
              isEmpty={form.wholesaleTiers.length === 0}
            >
              {form.wholesaleTiers.map((tier, index) => (
                <DynamicTableRow key={index} columns="minmax(0,140px) 1fr 40px">
                  <Input
                    type="number"
                    min={1}
                    value={tier.minQty}
                    onChange={(e) => updateWholesaleTier(index, { minQty: e.target.value })}
                    placeholder="50"
                  />
                  <CurrencyInput
                    value={tier.price}
                    onChange={(price) => updateWholesaleTier(index, { price })}
                    placeholder="45000"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => removeWholesaleTier(index)}
                    aria-label="Xóa bậc giá sỉ"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </DynamicTableRow>
              ))}
            </DynamicTable>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1"
              onClick={addWholesaleTier}
            >
              <Plus className="size-4" /> Thêm bậc giá sỉ
            </Button>
            <Separator className="my-4" />
            <p className="mb-2 text-sm font-medium">Giá đại lý / doanh nghiệp</p>
            <DynamicTable
              headers={['Số lượng tối thiểu', 'Giá / sản phẩm', '']}
              columns="minmax(0,140px) 1fr 40px"
              emptyText="Chưa có bậc giá đại lý."
              isEmpty={form.enterpriseTiers.length === 0}
            >
              {form.enterpriseTiers.map((tier, index) => (
                <DynamicTableRow key={index} columns="minmax(0,140px) 1fr 40px">
                  <Input
                    type="number"
                    min={1}
                    value={tier.minQty}
                    onChange={(e) => updateEnterpriseTier(index, { minQty: e.target.value })}
                  />
                  <CurrencyInput
                    value={tier.price}
                    onChange={(price) => updateEnterpriseTier(index, { price })}
                  />
                  <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeEnterpriseTier(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </DynamicTableRow>
              ))}
            </DynamicTable>
            <Button type="button" variant="outline" size="sm" className="mt-3 gap-1" onClick={addEnterpriseTier}>
              <Plus className="size-4" /> Thêm bậc giá đại lý
            </Button>
          </CollapsibleSection>

          <CollapsibleSection
            id="section-packaging"
            title="Quy cách đóng gói"
            description="Bán theo hộp, thùng, lốc..."
            defaultOpen={form.packagingUnits.length > 0}
          >
            <DynamicTable
              headers={['Tên quy cách', 'SL / quy cách', 'Giá / quy cách (tùy chọn)', '']}
              columns="1fr 140px 1fr 40px"
              emptyText="Chưa có quy cách đóng gói."
              isEmpty={form.packagingUnits.length === 0}
            >
              {form.packagingUnits.map((row, index) => (
                <DynamicTableRow key={index} columns="1fr 140px 1fr 40px">
                  <Input value={row.label} onChange={(e) => updatePackagingUnit(index, { label: e.target.value })} placeholder="Hộp" />
                  <Input type="number" min={1} value={row.qtyPerUnit} onChange={(e) => updatePackagingUnit(index, { qtyPerUnit: e.target.value })} placeholder="12" />
                  <CurrencyInput value={row.price} onChange={(price) => updatePackagingUnit(index, { price })} placeholder="để trống = tính theo giá lẻ/sỉ" />
                  <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removePackagingUnit(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </DynamicTableRow>
              ))}
            </DynamicTable>
            <Button type="button" variant="outline" size="sm" className="mt-3 gap-1" onClick={addPackagingUnit}>
              <Plus className="size-4" /> Thêm quy cách
            </Button>
          </CollapsibleSection>

          <CollapsibleSection
            id="section-specs"
            title="Thông số kỹ thuật"
            description="Kích thước, chất liệu và thuộc tính chi tiết"
            defaultOpen={form.specifications.length > 0}
          >
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
                    onChange={(e) => updateSpecification(index, { key: e.target.value })}
                    placeholder="Kích thước"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => updateSpecification(index, { value: e.target.value })}
                    placeholder="A4"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => removeSpecification(index)}
                    aria-label="Xóa thông số"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </DynamicTableRow>
              ))}
            </DynamicTable>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1"
              onClick={addSpecification}
            >
              <Plus className="size-4" /> Thêm thông số
            </Button>
          </CollapsibleSection>

          <CollapsibleSection
            id="section-promo"
            title="Khuyến mãi & tùy chỉnh"
            description="Flash Sale và tùy chọn in ấn"
            defaultOpen={form.isFlashSale || form.isCustomizable}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isFlashSale}
                    onCheckedChange={(checked) => set({ isFlashSale: checked })}
                    id="flashsale"
                  />
                  <Label htmlFor="flashsale" className="cursor-pointer font-medium">
                    Flash Sale
                  </Label>
                </div>
                {form.isFlashSale ? (
                  <div className="flex flex-wrap items-start gap-3">
                    <Field
                      label="Giá khuyến mãi"
                      data-field="flashSalePrice"
                      error={errors.flashSalePrice}
                      className="w-36"
                    >
                      <CurrencyInput
                        value={form.flashSalePrice}
                        onChange={(flashSalePrice) => set({ flashSalePrice })}
                        aria-invalid={Boolean(errors.flashSalePrice)}
                      />
                    </Field>
                    <Field label="Kết thúc" className="min-w-[200px]">
                      <Input
                        type="datetime-local"
                        value={form.flashSaleEnd}
                        onChange={(e) => set({ flashSaleEnd: e.target.value })}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3">
                <Switch
                  checked={form.isCustomizable}
                  onCheckedChange={setIsCustomizable}
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
                    <Button type="button" size="sm" variant="outline" onClick={addCustomizationOption}>
                      <Plus className="size-4" /> Thêm
                    </Button>
                  </div>
                  {form.customizationOptions.map((opt, idx) => (
                    <div key={idx} className="rounded-lg border bg-muted/20 p-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px_100px_40px] sm:items-end">
                        <Field label="Tên tùy chọn">
                          <Input
                            value={opt.label || ''}
                            onChange={(e) => updateCustomizationOption(idx, { label: e.target.value })}
                            placeholder="In tên / In logo"
                          />
                        </Field>
                        <Field label="Loại">
                          <Select
                            value={opt.inputType || 'text'}
                            onValueChange={(v: 'text' | 'image') =>
                              updateCustomizationOption(idx, { inputType: v })
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
                        </Field>
                        <Field label="Giá +">
                          <CurrencyInput
                            value={String(opt.extraPrice ?? 0)}
                            onChange={(v) =>
                              updateCustomizationOption(idx, { extraPrice: Number(v) || 0 })
                            }
                          />
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive sm:mb-0.5"
                          onClick={() => removeCustomizationOption(idx)}
                          aria-label="Xóa tùy chọn"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          value={opt.placeholder || ''}
                          onChange={(e) =>
                            updateCustomizationOption(idx, {
                              placeholder: e.target.value || undefined,
                            })
                          }
                          placeholder="Placeholder (tùy chọn)"
                          className="text-sm"
                        />
                        <Input
                          value={opt.helpText || ''}
                          onChange={(e) =>
                            updateCustomizationOption(idx, { helpText: e.target.value || undefined })
                          }
                          placeholder="Hướng dẫn (tùy chọn)"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CollapsibleSection>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[calc(3.5rem+4.25rem)] xl:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Xuất bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Trạng thái">
                <div className="grid gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set({ status: opt.value })}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-left transition-colors',
                        form.status === opt.value
                          ? opt.activeClass
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className="block text-xs opacity-80">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Danh mục" data-field="categoryId" error={errors.categoryId} required>
                <Select value={form.categoryId} onValueChange={(v) => set({ categoryId: v })}>
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
              </Field>
              <Field label="Thương hiệu" data-field="brandId" error={errors.brandId} required>
                <Select value={form.brandId} onValueChange={(v) => set({ brandId: v })}>
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
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Xem trước</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.imageUrls[0] ? (
                <img
                  src={form.imageUrls[0]}
                  alt={form.name || 'Preview'}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
              )}
              {form.imageUrls.length > 1 ? (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {form.imageUrls.slice(1, 5).map((url, i) => (
                    <img
                      key={`${url}-${i}`}
                      src={url}
                      alt=""
                      className="size-12 shrink-0 rounded-md object-cover"
                    />
                  ))}
                  {form.imageUrls.length > 5 ? (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      +{form.imageUrls.length - 5}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="line-clamp-2 font-medium leading-snug">
                  {form.name || 'Tên sản phẩm'}
                </p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-lg font-semibold text-primary">
                    {previewPrice != null && Number.isFinite(previewPrice)
                      ? formatCurrency(previewPrice)
                      : '—'}
                  </p>
                  {hasDiscount ? (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatCurrency(previewOriginal!)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={form.status === 'active' ? 'default' : 'secondary'}>
                  {STATUS_OPTIONS.find((o) => o.value === form.status)?.label}
                </Badge>
                {stockStatus !== 'ok' ? (
                  <Badge variant={stockStatus === 'out' ? 'destructive' : 'outline'}>
                    {STOCK_STATUS_LABELS[stockStatus]}
                  </Badge>
                ) : null}
                {form.isFlashSale ? <Badge variant="destructive">Flash Sale</Badge> : null}
                {form.isCustomizable ? <Badge variant="outline">Tùy chỉnh</Badge> : null}
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="font-mono text-xs">{form.sku || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Danh mục</dt>
                  <dd className="text-right">{categoryName || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Thương hiệu</dt>
                  <dd className="text-right">{brandName || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Tồn kho</dt>
                  <dd>{form.stock || '0'}</dd>
                </div>
              </dl>
              {storePreviewUrl ? (
                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                  <a href={storePreviewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    Xem trên cửa hàng
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Mục nội dung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              {PRODUCT_FORM_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    'block rounded-md px-2 py-1.5 text-sm transition-colors',
                    activeSection === section.id
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {section.label}
                </a>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-32 space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">{children}</div>
    </section>
  )
}

function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen,
  children,
}: {
  id: string
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <section id={id} className="scroll-mt-32">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronRight
          className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </button>
      {open ? (
        <div className="mt-3 rounded-xl border bg-card p-4 shadow-xs sm:p-5">{children}</div>
      ) : null}
    </section>
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

function Field({
  label,
  children,
  className,
  error,
  required,
  'data-field': dataField,
}: {
  label?: string
  children: React.ReactNode
  className?: string
  error?: string
  required?: boolean
  'data-field'?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)} data-field={dataField}>
      {label ? (
        <Label className="text-sm font-medium">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}