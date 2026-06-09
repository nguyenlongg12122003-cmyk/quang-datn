import {
  rowsToSpecifications,
  specificationsToRows,
  toDatetimeLocalValue,
} from '@/lib/product'
import { slugify } from '@/lib/utils'
import type { CustomizationOption, Product, WholesalePrice } from '@/types'

export interface SpecRow {
  key: string
  value: string
}

export interface WholesaleRow {
  minQty: string
  price: string
}

export interface ProductFormState {
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
  imageUrls: string[]
  tags: string
  colors: string
  isFlashSale: boolean
  flashSalePrice: string
  flashSaleEnd: string
  isCustomizable: boolean
  customizationOptions: CustomizationOption[]
  specifications: SpecRow[]
  wholesaleTiers: WholesaleRow[]
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  sku: '',
  slug: '',
  categoryId: '',
  brandId: '',
  price: '',
  originalPrice: '',
  stock: '0',
  status: 'active',
  description: '',
  imageUrls: [],
  tags: '',
  colors: '',
  isFlashSale: false,
  flashSalePrice: '',
  flashSaleEnd: '',
  isCustomizable: false,
  customizationOptions: [],
  specifications: [],
  wholesaleTiers: [],
}

export const PRODUCT_FORM_SECTIONS = [
  { id: 'section-basic', label: 'Thông tin sản phẩm' },
  { id: 'section-media', label: 'Hình ảnh' },
  { id: 'section-pricing', label: 'Giá & tồn kho' },
  { id: 'section-wholesale', label: 'Giá sỉ' },
  { id: 'section-specs', label: 'Thông số kỹ thuật' },
  { id: 'section-promo', label: 'Khuyến mãi & tùy chỉnh' },
] as const

export type ProductFormFieldErrors = Partial<
  Record<
    | 'name'
    | 'sku'
    | 'categoryId'
    | 'brandId'
    | 'price'
    | 'originalPrice'
    | 'flashSalePrice',
    string
  >
>

export function getProductFormFieldErrors(form: ProductFormState): ProductFormFieldErrors {
  const errors: ProductFormFieldErrors = {}
  if (!form.name.trim()) errors.name = 'Nhập tên sản phẩm'
  if (!form.sku.trim()) errors.sku = 'Nhập SKU'
  if (!form.categoryId) errors.categoryId = 'Chọn danh mục'
  if (!form.brandId) errors.brandId = 'Chọn thương hiệu'
  if (!form.price) errors.price = 'Nhập giá bán'
  if (!form.originalPrice) errors.originalPrice = 'Nhập giá gốc'
  if (form.isFlashSale && !form.flashSalePrice) {
    errors.flashSalePrice = 'Nhập giá Flash Sale hoặc tắt Flash Sale'
  }
  return errors
}

function normalizeCustomizationOptionsForForm(
  raw: Product['customizationOptions'],
): CustomizationOption[] {
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
      const label = String((opt as CustomizationOption).label || '').trim()
      if (!label) return null
      const inputType = (opt as CustomizationOption).inputType === 'image' ? 'image' : 'text'
      const extraPrice = Number.isFinite(Number((opt as CustomizationOption).extraPrice))
        ? Number((opt as CustomizationOption).extraPrice)
        : 0
      return {
        label,
        inputType,
        extraPrice,
        placeholder: (opt as CustomizationOption).placeholder || undefined,
        helpText: (opt as CustomizationOption).helpText || undefined,
      }
    })
    .filter(Boolean) as CustomizationOption[]
}

function wholesaleToRows(tiers: WholesalePrice[] | undefined): WholesaleRow[] {
  if (!tiers?.length) return []
  return tiers.map((tier) => ({
    minQty: String(tier.minQty),
    price: String(tier.price),
  }))
}

export function buildProductFormState(product: Product | null): ProductFormState {
  if (!product) return EMPTY_PRODUCT_FORM
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
    imageUrls: (product.images ?? []).map((img) => img.url).filter(Boolean),
    tags: (product.tags ?? []).join(', '),
    colors: (product.colors ?? []).join(', '),
    isFlashSale: Boolean(product.isFlashSale),
    flashSalePrice: product.flashSalePrice ? String(product.flashSalePrice) : '',
    flashSaleEnd: toDatetimeLocalValue(product.flashSaleEnd),
    isCustomizable: Boolean(product.isCustomizable),
    customizationOptions: normalizeCustomizationOptionsForForm(product.customizationOptions),
    specifications: specificationsToRows(product.specifications),
    wholesaleTiers: wholesaleToRows(product.wholesalePrice),
  }
}

export function validateProductForm(form: ProductFormState): string | null {
  const errors = getProductFormFieldErrors(form)
  const keys = Object.keys(errors)
  if (keys.length === 0) return null
  if (keys.length === 1) return Object.values(errors)[0] ?? null
  return 'Vui lòng kiểm tra các trường được đánh dấu'
}

export function buildProductPayload(form: ProductFormState): Partial<Product> {
  const csv = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean)

  const customizationOptions: CustomizationOption[] = form.isCustomizable
    ? form.customizationOptions
        .filter((o) => o.label?.trim())
        .map((o) => ({
          label: o.label.trim(),
          inputType: (o.inputType === 'image' ? 'image' : 'text') as 'text' | 'image',
          extraPrice: Number.isFinite(Number(o.extraPrice)) ? Number(o.extraPrice) : 0,
          ...(o.placeholder ? { placeholder: o.placeholder } : {}),
          ...(o.helpText ? { helpText: o.helpText } : {}),
        }))
    : []

  const wholesalePrice: WholesalePrice[] = form.wholesaleTiers
    .filter((tier) => tier.minQty && tier.price)
    .map((tier) => ({
      minQty: Number(tier.minQty),
      price: Number(tier.price),
    }))
    .filter((tier) => Number.isFinite(tier.minQty) && tier.minQty > 0 && Number.isFinite(tier.price))

  return {
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
    images: form.imageUrls.map((url, index) => ({
      id: `${form.sku}-img-${index + 1}`,
      url,
      alt: form.name,
    })),
    tags: csv(form.tags),
    colors: csv(form.colors),
    isFlashSale: form.isFlashSale,
    flashSalePrice: form.isFlashSale && form.flashSalePrice ? Number(form.flashSalePrice) : null,
    flashSaleEnd:
      form.isFlashSale && form.flashSaleEnd ? new Date(form.flashSaleEnd).toISOString() : null,
    isCustomizable: form.isCustomizable,
    customizationOptions,
    specifications: rowsToSpecifications(form.specifications),
    wholesalePrice,
  }
}