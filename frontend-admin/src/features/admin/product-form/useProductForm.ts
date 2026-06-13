import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useBrands, useCategories } from '@/features/catalog/api'
import { useCreateProduct, useUpdateProduct } from '@/features/admin/api'
import {
  buildProductFormState,
  buildProductPayload,
  getProductFormFieldErrors,
  isProductFormDirty,
  validateProductForm,
  type ProductFormFieldErrors,
  type ProductFormState,
  type SpecRow,
  type TierTab,
  type WholesaleRow,
  type PackagingRow,
} from '@/features/admin/product-form-utils'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { getErrorMessage } from '@/lib/api/axios'
import { slugify } from '@/lib/utils'
import type { CustomizationOption, Product } from '@/types'

export type ProductFormTab = 'general' | 'media' | 'pricing' | 'advanced'

const ERROR_TAB: Partial<Record<keyof ProductFormFieldErrors, ProductFormTab>> = {
  name: 'general',
  sku: 'general',
  categoryId: 'general',
  brandId: 'general',
  price: 'pricing',
  originalPrice: 'pricing',
  flashSalePrice: 'advanced',
}

export function useProductForm(
  product: Product | null,
  onSuccess: () => void,
) {
  const { data: categories = [] } = useCategories()
  const { data: brands = [] } = useBrands()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const initialForm = useMemo(() => buildProductFormState(product), [product])
  const [form, setForm] = useState<ProductFormState>(initialForm)
  const [errors, setErrors] = useState<ProductFormFieldErrors>({})
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug))
  const [tierTab, setTierTab] = useState<TierTab>('public')
  const [activeTab, setActiveTab] = useState<ProductFormTab>('general')

  const isDirty = isProductFormDirty(initialForm, form)
  const { confirmLeave } = useUnsavedChanges(isDirty)
  const pending = createProduct.isPending || updateProduct.isPending

  const patch = useCallback((update: Partial<ProductFormState>) => {
    setForm((prev) => ({ ...prev, ...update }))
    setErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(update) as Array<keyof ProductFormFieldErrors>) {
        if (key in next) delete next[key]
      }
      return next
    })
  }, [])

  const submit = useCallback(() => {
    const fieldErrors = getProductFormFieldErrors(form)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      toast.error(validateProductForm(form) ?? 'Vui lòng kiểm tra các trường được đánh dấu')
      const firstKey = Object.keys(fieldErrors)[0] as keyof ProductFormFieldErrors
      const tab = ERROR_TAB[firstKey] ?? 'general'
      setActiveTab(tab)
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-field="${firstKey}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
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

  const regenerateSlug = useCallback(() => {
    if (!form.name.trim()) {
      toast.error('Nhập tên sản phẩm trước')
      return
    }
    patch({ slug: slugify(form.name) })
    setSlugTouched(true)
  }, [form.name, patch])

  const setIsCustomizable = useCallback(
    (val: boolean) => {
      const update: Partial<ProductFormState> = { isCustomizable: val }
      if (!val) update.customizationOptions = []
      else if (form.customizationOptions.length === 0) {
        update.customizationOptions = [{ label: '', inputType: 'text', extraPrice: 0 }]
      }
      patch(update)
    },
    [form.customizationOptions.length, patch],
  )

  const makeTierHandlers = useCallback(
    (key: 'publicBulkTiers' | 'wholesaleTiers' | 'enterpriseTiers') => ({
      onAdd: () => patch({ [key]: [...form[key], { minQty: '', price: '' }] } as Partial<ProductFormState>),
      onUpdate: (index: number, rowPatch: Partial<WholesaleRow>) =>
        patch({
          [key]: form[key].map((tier, i) => (i === index ? { ...tier, ...rowPatch } : tier)),
        } as Partial<ProductFormState>),
      onRemove: (index: number) =>
        patch({ [key]: form[key].filter((_, i) => i !== index) } as Partial<ProductFormState>),
    }),
    [form, patch],
  )

  return {
    form,
    errors,
    patch,
    submit,
    pending,
    isDirty,
    confirmLeave,
    categories,
    brands,
    slugTouched,
    setSlugTouched,
    tierTab,
    setTierTab,
    activeTab,
    setActiveTab,
    regenerateSlug,
    setIsCustomizable,
    tierHandlers: {
      public: makeTierHandlers('publicBulkTiers'),
      wholesale: makeTierHandlers('wholesaleTiers'),
      enterprise: makeTierHandlers('enterpriseTiers'),
    },
    specs: {
      add: () => patch({ specifications: [...form.specifications, { key: '', value: '' }] }),
      update: (index: number, rowPatch: Partial<SpecRow>) =>
        patch({
          specifications: form.specifications.map((row, i) =>
            i === index ? { ...row, ...rowPatch } : row,
          ),
        }),
      remove: (index: number) =>
        patch({ specifications: form.specifications.filter((_, i) => i !== index) }),
    },
    packaging: {
      add: () =>
        patch({
          packagingUnits: [...form.packagingUnits, { label: '', qtyPerUnit: '', price: '' }],
        }),
      update: (index: number, rowPatch: Partial<PackagingRow>) =>
        patch({
          packagingUnits: form.packagingUnits.map((row, i) =>
            i === index ? { ...row, ...rowPatch } : row,
          ),
        }),
      remove: (index: number) =>
        patch({ packagingUnits: form.packagingUnits.filter((_, i) => i !== index) }),
    },
    customization: {
      add: () =>
        patch({
          customizationOptions: [
            ...form.customizationOptions,
            { label: '', inputType: 'text', extraPrice: 0 },
          ],
        }),
      update: (index: number, optPatch: Partial<CustomizationOption>) =>
        patch({
          customizationOptions: form.customizationOptions.map((opt, i) =>
            i === index ? { ...opt, ...optPatch } : opt,
          ),
        }),
      remove: (index: number) =>
        patch({
          customizationOptions: form.customizationOptions.filter((_, i) => i !== index),
        }),
    },
  }
}