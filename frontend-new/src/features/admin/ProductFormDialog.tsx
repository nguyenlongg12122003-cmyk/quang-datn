import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUploader } from '@/components/common/ImageUploader'
import { useBrands, useCategories } from '@/features/catalog/api'
import { useCreateProduct, useUpdateProduct } from '@/features/admin/api'
import { getErrorMessage } from '@/lib/api/axios'
import { slugify } from '@/lib/utils'
import type { CustomizationOption, Product } from '@/types'

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

interface FormState {
  name: string
  sku: string
  slug: string
  categoryId: string
  brandId: string
  price: string
  originalPrice: string
  stock: string
  status: Product['status']
  description: string
  imageUrl: string
  tags: string
  colors: string
  isFlashSale: boolean
  flashSalePrice: string
  isCustomizable: boolean
  customizationOptions: CustomizationOption[]
}

type FormCustomizationOption = CustomizationOption

const EMPTY: FormState = {
  name: '', sku: '', slug: '', categoryId: '', brandId: '', price: '', originalPrice: '',
  stock: '0', status: 'active', description: '', imageUrl: '', tags: '', colors: '',
  isFlashSale: false, flashSalePrice: '', isCustomizable: false,
  customizationOptions: [],
}

function normalizeCustomizationOptionsForForm(raw: Product['customizationOptions']): CustomizationOption[] {
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : []
  return arr
    .map((opt) => {
      if (typeof opt === 'string') {
        const label = opt.trim()
        if (!label) return null
        return { label, inputType: 'text' as const, extraPrice: 0 }
      }
      if (!opt || typeof opt !== 'object') return null
      const label = String((opt as any).label || '').trim()
      if (!label) return null
      const inputType = (opt as any).inputType === 'image' ? 'image' : 'text'
      const extraPrice = Number.isFinite(Number((opt as any).extraPrice)) ? Number((opt as any).extraPrice) : 0
      return {
        label,
        inputType,
        extraPrice,
        placeholder: (opt as any).placeholder || undefined,
        helpText: (opt as any).helpText || undefined,
      }
    })
    .filter(Boolean) as CustomizationOption[]
}

function buildInitialState(product: Product | null): FormState {
  if (!product) return EMPTY
  return {
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    categoryId: product.categoryId,
    brandId: product.brandId,
    price: String(product.price),
    originalPrice: String(product.originalPrice),
    stock: String(product.stock),
    status: product.status,
    description: product.description ?? '',
    imageUrl: product.images?.[0]?.url ?? '',
    tags: (product.tags ?? []).join(', '),
    colors: (product.colors ?? []).join(', '),
    isFlashSale: Boolean(product.isFlashSale),
    flashSalePrice: product.flashSalePrice ? String(product.flashSalePrice) : '',
    isCustomizable: Boolean(product.isCustomizable),
    customizationOptions: normalizeCustomizationOptionsForForm(product.customizationOptions),
  }
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[720px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
        </DialogHeader>
        {/* key remounts the body so its state re-initializes from props. */}
        <ProductFormBody key={product?.id ?? 'new'} product={product} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface ProductFormBodyProps {
  product: Product | null
  onClose: () => void
}

function ProductFormBody({ product, onClose }: ProductFormBodyProps) {
  const { data: categories = [] } = useCategories()
  const { data: brands = [] } = useBrands()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const [form, setForm] = useState<FormState>(() => buildInitialState(product))

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  // --- Customization options management ---
  const addCustomizationOption = () => {
    const newOpt: FormCustomizationOption = {
      label: '',
      inputType: 'text',
      extraPrice: 0,
    }
    set({ customizationOptions: [...form.customizationOptions, newOpt] })
  }

  const updateCustomizationOption = (index: number, patch: Partial<FormCustomizationOption>) => {
    const next = form.customizationOptions.map((opt, i) =>
      i === index ? { ...opt, ...patch } : opt
    )
    set({ customizationOptions: next })
  }

  const removeCustomizationOption = (index: number) => {
    const next = form.customizationOptions.filter((_, i) => i !== index)
    set({ customizationOptions: next })
  }

  const setIsCustomizable = (val: boolean) => {
    const patch: Partial<FormState> = { isCustomizable: val }
    if (!val) {
      // Clear options when disabling to avoid stale data
      patch.customizationOptions = []
    } else if (form.customizationOptions.length === 0) {
      // Seed one empty option when enabling for first time
      patch.customizationOptions = [{ label: '', inputType: 'text', extraPrice: 0 }]
    }
    set(patch)
  }

  const submit = () => {
    if (!form.name || !form.sku || !form.categoryId || !form.brandId || !form.price || !form.originalPrice) {
      toast.error('Vui lòng nhập đủ: tên, SKU, danh mục, thương hiệu, giá, giá gốc')
      return
    }
    const csv = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean)

    // Prepare clean customizationOptions only when enabled
    const customizationOptionsPayload: CustomizationOption[] = form.isCustomizable
      ? form.customizationOptions
          .filter((o) => o.label && o.label.trim())
          .map((o) => ({
            label: o.label.trim(),
            inputType: (o.inputType === 'image' ? 'image' : 'text') as 'text' | 'image',
            extraPrice: Number.isFinite(Number(o.extraPrice)) ? Number(o.extraPrice) : 0,
            ...(o.placeholder ? { placeholder: o.placeholder } : {}),
            ...(o.helpText ? { helpText: o.helpText } : {}),
          }))
      : []

    const payload: Partial<Product> = {
      name: form.name,
      sku: form.sku,
      slug: form.slug || slugify(form.name),
      categoryId: form.categoryId,
      brandId: form.brandId,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice),
      stock: Number(form.stock),
      status: form.status,
      description: form.description,
      images: form.imageUrl
        ? [{ id: `${form.sku}-img-1`, url: form.imageUrl, alt: form.name }]
        : [],
      tags: csv(form.tags),
      colors: csv(form.colors),
      isFlashSale: form.isFlashSale,
      flashSalePrice: form.isFlashSale && form.flashSalePrice ? Number(form.flashSalePrice) : null,
      isCustomizable: form.isCustomizable,
      customizationOptions: customizationOptionsPayload,
    }

    const onDone = {
      onSuccess: () => {
        toast.success(product ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm')
        onClose()
      },
      onError: (error: unknown) => toast.error(getErrorMessage(error)),
    }

    if (product) updateProduct.mutate({ id: product.id, payload }, onDone)
    else createProduct.mutate(payload, onDone)
  }

  const pending = createProduct.isPending || updateProduct.isPending

  return (
    <>
      <div className="space-y-3.5">
        {/* Basic */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tên sản phẩm" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Tên sản phẩm"
            />
          </Field>

          <Field label="SKU">
            <Input value={form.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="SKU-001" />
          </Field>
          <Field label="Slug">
            <Input
              value={form.slug}
              onChange={(e) => set({ slug: e.target.value })}
              placeholder="tự động nếu để trống"
            />
          </Field>
        </div>

        {/* Category / Brand / Status */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Danh mục">
            <Select value={form.categoryId} onValueChange={(v) => set({ categoryId: v })}>
              <SelectTrigger>
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
          <Field label="Thương hiệu">
            <Select value={form.brandId} onValueChange={(v) => set({ brandId: v })}>
              <SelectTrigger>
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
          <Field label="Trạng thái">
            <Select value={form.status} onValueChange={(v) => set({ status: v as Product['status'] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Đang bán</SelectItem>
                <SelectItem value="inactive">Ngừng bán</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Pricing & Stock */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Giá bán">
            <Input
              type="number"
              value={form.price}
              onChange={(e) => set({ price: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Giá gốc">
            <Input
              type="number"
              value={form.originalPrice}
              onChange={(e) => set({ originalPrice: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Tồn kho">
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => set({ stock: e.target.value })}
              placeholder="0"
            />
          </Field>
        </div>

        {/* Image */}
        <Field label="Ảnh sản phẩm">
          <ImageUploader
            value={form.imageUrl}
            onChange={(url) => set({ imageUrl: url })}
            previewClassName="size-20"
          />
        </Field>

        {/* Tags & Colors */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tags">
            <Input
              value={form.tags}
              onChange={(e) => set({ tags: e.target.value })}
              placeholder="văn phòng, in ấn, quà tặng"
            />
          </Field>
          <Field label="Màu sắc">
            <Input
              value={form.colors}
              onChange={(e) => set({ colors: e.target.value })}
              placeholder="Đỏ, Xanh dương, Đen"
            />
          </Field>
        </div>

        {/* Description */}
        <Field label="Mô tả">
          <Textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Mô tả ngắn gọn về sản phẩm..."
            className="min-h-[72px]"
          />
        </Field>

        {/* Options - compact */}
        <div className="rounded-md border border-border p-2.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isFlashSale}
                onCheckedChange={(c) => set({ isFlashSale: c })}
                id="flashsale"
              />
              <Label htmlFor="flashsale" className="cursor-pointer text-sm">
                Flash Sale
              </Label>
              {form.isFlashSale && (
                <Input
                  type="number"
                  value={form.flashSalePrice}
                  onChange={(e) => set({ flashSalePrice: e.target.value })}
                  className="h-7 w-20 text-sm"
                  placeholder="Giá KM"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isCustomizable}
                onCheckedChange={setIsCustomizable}
                id="customizable"
              />
              <Label htmlFor="customizable" className="cursor-pointer text-sm">
                Cho phép tùy chỉnh in
              </Label>
            </div>
          </div>
        </div>

        {/* Customization options editor (only when enabled) */}
        {form.isCustomizable && (
          <div className="space-y-2 rounded-md border border-border p-2.5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Tùy chọn in ấn</div>
              <Button type="button" size="sm" variant="outline" onClick={addCustomizationOption}>
                + Thêm
              </Button>
            </div>

            {form.customizationOptions.length === 0 ? (
              <div className="text-xs text-muted-foreground py-0.5">Chưa có tùy chọn.</div>
            ) : null}

            <div className="space-y-2">
              {form.customizationOptions.map((opt, idx) => (
                <div key={idx} className="rounded border border-border/60 bg-muted/20 p-2">
                  {/* Main row: Label + Type + Price + Delete */}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[160px] flex-1">
                      <Label className="text-[10px] text-muted-foreground">Tên tùy chọn</Label>
                      <Input
                        value={opt.label || ''}
                        onChange={(e) => updateCustomizationOption(idx, { label: e.target.value })}
                        placeholder="In tên / In logo"
                        className="h-8"
                      />
                    </div>

                    <div className="w-[100px]">
                      <Label className="text-[10px] text-muted-foreground">Loại</Label>
                      <Select
                        value={opt.inputType || 'text'}
                        onValueChange={(v: 'text' | 'image') => updateCustomizationOption(idx, { inputType: v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="image">Ảnh</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[80px]">
                      <Label className="text-[10px] text-muted-foreground">Giá +</Label>
                      <Input
                        type="number"
                        value={opt.extraPrice ?? 0}
                        onChange={(e) => updateCustomizationOption(idx, { extraPrice: Number(e.target.value) || 0 })}
                        className="h-8"
                        placeholder="0"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mb-0.5 h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeCustomizationOption(idx)}
                      aria-label="Xóa tùy chọn"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {/* Optional fields - compact, no labels */}
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={opt.placeholder || ''}
                      onChange={(e) => updateCustomizationOption(idx, { placeholder: e.target.value || undefined })}
                      placeholder="Placeholder (tùy chọn)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={opt.helpText || ''}
                      onChange={(e) => updateCustomizationOption(idx, { helpText: e.target.value || undefined })}
                      placeholder="Hướng dẫn (tùy chọn)"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu sản phẩm'}
        </Button>
      </DialogFooter>
    </>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ? `space-y-1 ${className}` : 'space-y-1'}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
