import { useState } from 'react'
import { toast } from 'sonner'
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
import type { Product } from '@/types'

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
}

const EMPTY: FormState = {
  name: '', sku: '', slug: '', categoryId: '', brandId: '', price: '', originalPrice: '',
  stock: '0', status: 'active', description: '', imageUrl: '', tags: '', colors: '',
  isFlashSale: false, flashSalePrice: '', isCustomizable: false,
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
  }
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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

  const submit = () => {
    if (!form.name || !form.sku || !form.categoryId || !form.brandId || !form.price || !form.originalPrice) {
      toast.error('Vui lòng nhập đủ: tên, SKU, danh mục, thương hiệu, giá, giá gốc')
      return
    }
    const csv = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean)
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên sản phẩm" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="SKU">
            <Input value={form.sku} onChange={(e) => set({ sku: e.target.value })} />
          </Field>
          <Field label="Slug (tự tạo nếu trống)">
            <Input value={form.slug} onChange={(e) => set({ slug: e.target.value })} />
          </Field>
          <Field label="Danh mục">
            <Select value={form.categoryId} onValueChange={(v) => set({ categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Thương hiệu">
            <Select value={form.brandId} onValueChange={(v) => set({ brandId: v })}>
              <SelectTrigger><SelectValue placeholder="Chọn thương hiệu" /></SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Giá bán">
            <Input type="number" value={form.price} onChange={(e) => set({ price: e.target.value })} />
          </Field>
          <Field label="Giá gốc">
            <Input type="number" value={form.originalPrice} onChange={(e) => set({ originalPrice: e.target.value })} />
          </Field>
          <Field label="Tồn kho">
            <Input type="number" value={form.stock} onChange={(e) => set({ stock: e.target.value })} />
          </Field>
          <Field label="Trạng thái">
            <Select value={form.status} onValueChange={(v) => set({ status: v as Product['status'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Đang bán</SelectItem>
                <SelectItem value="inactive">Ngừng bán</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ảnh sản phẩm" className="sm:col-span-2">
            <ImageUploader
              value={form.imageUrl}
              onChange={(url) => set({ imageUrl: url })}
              previewClassName="size-28"
            />
          </Field>
          <Field label="Tags (phân tách bằng dấu phẩy)">
            <Input value={form.tags} onChange={(e) => set({ tags: e.target.value })} />
          </Field>
          <Field label="Màu sắc (phân tách bằng dấu phẩy)">
            <Input value={form.colors} onChange={(e) => set({ colors: e.target.value })} />
          </Field>
          <Field label="Mô tả" className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>Flash Sale</Label>
            <Switch checked={form.isFlashSale} onCheckedChange={(c) => set({ isFlashSale: c })} />
          </div>
          {form.isFlashSale ? (
            <Field label="Giá Flash Sale">
              <Input type="number" value={form.flashSalePrice} onChange={(e) => set({ flashSalePrice: e.target.value })} />
            </Field>
          ) : (
            <div />
          )}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>Cho phép tùy chỉnh in</Label>
            <Switch checked={form.isCustomizable} onCheckedChange={(c) => set({ isCustomizable: c })} />
          </div>
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
    <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
