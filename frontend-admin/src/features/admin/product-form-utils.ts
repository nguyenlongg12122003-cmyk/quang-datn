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

export interface PackagingRow {
  label: string
  qtyPerUnit: string
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
  publicBulkTiers: WholesaleRow[]
  wholesaleTiers: WholesaleRow[]
  enterpriseTiers: WholesaleRow[]
  packagingUnits: PackagingRow[]
  barcode: string
  lowStockThreshold: string
  customizationLeadDays: string
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
  publicBulkTiers: [],
  wholesaleTiers: [],
  enterpriseTiers: [],
  packagingUnits: [],
  barcode: '',
  lowStockThreshold: '10',
  customizationLeadDays: '3',
}

export const PRODUCT_FORM_SECTIONS = [
  { id: 'section-basic', label: 'Thông tin sản phẩm' },
  { id: 'section-media', label: 'Hình ảnh' },
  { id: 'section-pricing', label: 'Giá & tồn kho' },
  { id: 'section-wholesale', label: 'Bảng giá theo SL' },
  { id: 'section-packaging', label: 'Quy cách đóng gói' },
  { id: 'section-specs', label: 'Thông số kỹ thuật' },
  { id: 'section-promo', label: 'Khuyến mãi & tùy chỉnh' },
] as const

export type TierTab = 'public' | 'wholesale' | 'enterprise'

export const TIER_TAB_META: Record<
  TierTab,
  { label: string; audience: string; storage: string }
> = {
  public: {
    label: 'Giá lẻ (bulk)',
    audience: 'Khách lẻ thường — hiển thị tab "Giá ưu đãi khi mua số lượng lớn"',
    storage: 'Lưu vào wholesalePrice',
  },
  wholesale: {
    label: 'Giá sỉ B2B',
    audience: 'Doanh nghiệp sỉ đã được admin duyệt',
    storage: 'Lưu vào groupPrices.wholesale',
  },
  enterprise: {
    label: 'Giá đại lý B2B',
    audience: 'Doanh nghiệp đại lý đã được admin duyệt',
    storage: 'Lưu vào groupPrices.enterprise',
  },
}

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

export interface TierRowWarning {
  index: number
  message: string
}

export function parseCsvField(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export function getDiscountPercent(price: number, originalPrice: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(originalPrice)) return 0
  if (originalPrice <= price) return 0
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

export function rowsToWholesalePrices(rows: WholesaleRow[]): WholesalePrice[] {
  return rows
    .filter((tier) => tier.minQty && tier.price)
    .map((tier) => ({
      minQty: Number(tier.minQty),
      price: Number(tier.price),
    }))
    .filter(
      (tier) =>
        Number.isFinite(tier.minQty) && tier.minQty > 0 && Number.isFinite(tier.price),
    )
    .sort((a, b) => a.minQty - b.minQty)
}

export function getTierRowWarnings(
  rows: WholesaleRow[],
  basePrice: number | null,
): TierRowWarning[] {
  const warnings: TierRowWarning[] = []
  const parsed = rows
    .map((row, index) => ({
      index,
      minQty: Number(row.minQty),
      price: Number(row.price),
    }))
    .filter((row) => row.minQty > 0 && Number.isFinite(row.price))

  const qtyCounts = new Map<number, number>()
  for (const row of parsed) {
    qtyCounts.set(row.minQty, (qtyCounts.get(row.minQty) ?? 0) + 1)
  }
  for (const row of parsed) {
    if ((qtyCounts.get(row.minQty) ?? 0) > 1) {
      warnings.push({ index: row.index, message: `Trùng SL tối thiểu ${row.minQty}` })
    }
  }

  const sorted = [...parsed].sort((a, b) => a.minQty - b.minQty)
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].price > sorted[i - 1].price) {
      warnings.push({
        index: sorted[i].index,
        message: `Giá bậc ${sorted[i].minQty} sp cao hơn bậc ${sorted[i - 1].minQty} sp`,
      })
    }
  }

  if (basePrice != null && Number.isFinite(basePrice)) {
    for (const row of parsed) {
      if (row.price > basePrice) {
        warnings.push({
          index: row.index,
          message: `Giá tier (${row.price.toLocaleString('vi-VN')}đ) cao hơn giá lẻ`,
        })
      }
    }
  }

  return warnings
}

export function getTierPreview(
  tiers: WholesaleRow[],
  qty: number,
  basePrice: number,
): number | null {
  const parsed = rowsToWholesalePrices(tiers).filter((t) => qty >= t.minQty)
  if (!parsed.length) return null
  const best = Math.min(...parsed.map((t) => t.price))
  return Math.min(basePrice, best)
}

export interface PriceHints {
  discountPercent: number
  flashSaleDiscountPercent: number
  warnings: string[]
}

export function getPriceHints(form: ProductFormState): PriceHints {
  const price = Number(form.price)
  const originalPrice = Number(form.originalPrice)
  const flashPrice = Number(form.flashSalePrice)
  const warnings: string[] = []

  if (Number.isFinite(price) && Number.isFinite(originalPrice) && price > originalPrice) {
    warnings.push('Giá bán cao hơn giá gốc — khách sẽ không thấy giảm giá')
  }

  if (form.isFlashSale) {
    if (!Number.isFinite(flashPrice)) {
      warnings.push('Bật Flash Sale nhưng chưa nhập giá khuyến mãi')
    } else if (Number.isFinite(price) && flashPrice >= price) {
      warnings.push('Giá Flash Sale nên thấp hơn giá bán')
    }
    if (form.flashSaleEnd) {
      const end = new Date(form.flashSaleEnd).getTime()
      if (!Number.isNaN(end) && end <= Date.now()) {
        warnings.push('Thời gian Flash Sale đã qua — khách sẽ không thấy khuyến mãi')
      }
    }
  }

  const effectivePrice =
    form.isFlashSale && Number.isFinite(flashPrice) ? flashPrice : price

  return {
    discountPercent: getDiscountPercent(
      Number.isFinite(effectivePrice) ? effectivePrice : 0,
      Number.isFinite(originalPrice) ? originalPrice : 0,
    ),
    flashSaleDiscountPercent: getDiscountPercent(
      Number.isFinite(flashPrice) ? flashPrice : 0,
      Number.isFinite(originalPrice) ? originalPrice : 0,
    ),
    warnings,
  }
}

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
    publicBulkTiers: wholesaleToRows(product.wholesalePrice),
    wholesaleTiers: wholesaleToRows(product.groupPrices?.wholesale),
    enterpriseTiers: wholesaleToRows(product.groupPrices?.enterprise),
    packagingUnits: (product.packagingUnits ?? []).map((unit) => ({
      label: unit.label,
      qtyPerUnit: String(unit.qtyPerUnit),
      price: unit.price != null ? String(unit.price) : '',
    })),
    barcode: product.barcode ?? '',
    lowStockThreshold: String(product.lowStockThreshold ?? 10),
    customizationLeadDays: String(product.customizationLeadDays ?? 3),
  }
}

export function validateProductForm(form: ProductFormState): string | null {
  const errors = getProductFormFieldErrors(form)
  const keys = Object.keys(errors)
  if (keys.length === 0) return null
  if (keys.length === 1) return Object.values(errors)[0] ?? null
  return 'Vui lòng kiểm tra các trường được đánh dấu'
}

export function isProductFormDirty(
  initial: ProductFormState,
  current: ProductFormState,
): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current)
}

export function buildProductPayload(form: ProductFormState): Partial<Product> {
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

  const wholesalePrice = rowsToWholesalePrices(form.publicBulkTiers)
  const wholesaleB2B = rowsToWholesalePrices(form.wholesaleTiers)
  const enterpriseTiers = rowsToWholesalePrices(form.enterpriseTiers)

  const packagingUnits = form.packagingUnits
    .filter((row) => row.label && row.qtyPerUnit)
    .map((row) => ({
      label: row.label.trim(),
      qtyPerUnit: Number(row.qtyPerUnit),
      price: row.price ? Number(row.price) : null,
    }))
    .filter((row) => Number.isFinite(row.qtyPerUnit) && row.qtyPerUnit > 0)

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
    tags: parseCsvField(form.tags),
    colors: parseCsvField(form.colors),
    isFlashSale: form.isFlashSale,
    flashSalePrice: form.isFlashSale && form.flashSalePrice ? Number(form.flashSalePrice) : null,
    flashSaleEnd:
      form.isFlashSale && form.flashSaleEnd ? new Date(form.flashSaleEnd).toISOString() : null,
    isCustomizable: form.isCustomizable,
    customizationOptions,
    specifications: rowsToSpecifications(form.specifications),
    wholesalePrice,
    groupPrices: {
      wholesale: wholesaleB2B,
      enterprise: enterpriseTiers,
    },
    packagingUnits,
    barcode: form.barcode.trim() || null,
    lowStockThreshold: Number(form.lowStockThreshold) || 10,
    customizationLeadDays: Number(form.customizationLeadDays) || 3,
  }
}