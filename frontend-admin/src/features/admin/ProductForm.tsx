import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductFormAdvancedTab } from '@/features/admin/product-form/ProductFormAdvancedTab'
import { ProductFormGeneralTab } from '@/features/admin/product-form/ProductFormGeneralTab'
import { ProductFormMediaTab } from '@/features/admin/product-form/ProductFormMediaTab'
import { ProductFormPricingTab } from '@/features/admin/product-form/ProductFormPricingTab'
import { ProductPublishSidebar } from '@/features/admin/product-form/ProductPublishSidebar'
import { useProductForm } from '@/features/admin/product-form/useProductForm'
import type { Product } from '@/types'

interface ProductFormProps {
  product: Product | null
  onSuccess: () => void
  onCancel: () => void
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const {
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
    tierHandlers,
    specs,
    packaging,
    customization,
  } = useProductForm(product, onSuccess)

  const handleCancel = () => {
    if (confirmLeave()) onCancel()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleCancel}
            aria-label="Quay lại danh sách"
            className="shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
              </h1>
              {isDirty ? (
                <Badge variant="secondary" className="font-normal">
                  Chưa lưu
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {form.name.trim() || 'Chưa có tên'}
              {form.sku ? ` · ${form.sku}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={pending}>
            Hủy
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? 'Đang lưu…' : product ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="shadow-sm">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <CardHeader className="border-b pb-0">
              <CardTitle className="text-base">Chi tiết sản phẩm</CardTitle>
              <CardDescription>Điền thông tin theo từng nhóm bên dưới.</CardDescription>
              <TabsList
                variant="line"
                className="mt-4 h-auto w-full justify-start rounded-none border-b bg-transparent p-0"
              >
                <TabsTrigger value="general" className="rounded-none px-4 py-2.5">
                  Thông tin
                </TabsTrigger>
                <TabsTrigger value="media" className="rounded-none px-4 py-2.5">
                  Hình ảnh
                </TabsTrigger>
                <TabsTrigger value="pricing" className="rounded-none px-4 py-2.5">
                  Giá & kho
                </TabsTrigger>
                <TabsTrigger value="advanced" className="rounded-none px-4 py-2.5">
                  Nâng cao
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="general" className="mt-0">
                <ProductFormGeneralTab
                  form={form}
                  errors={errors}
                  slugTouched={slugTouched}
                  onPatch={patch}
                  onSlugTouched={() => setSlugTouched(true)}
                  onRegenerateSlug={regenerateSlug}
                />
              </TabsContent>
              <TabsContent value="media" className="mt-0">
                <ProductFormMediaTab form={form} onPatch={patch} />
              </TabsContent>
              <TabsContent value="pricing" className="mt-0">
                <ProductFormPricingTab
                  form={form}
                  errors={errors}
                  tierTab={tierTab}
                  onTierTabChange={setTierTab}
                  onPatch={patch}
                  tierHandlers={tierHandlers}
                  packaging={packaging}
                />
              </TabsContent>
              <TabsContent value="advanced" className="mt-0">
                <ProductFormAdvancedTab
                  form={form}
                  errors={errors}
                  onPatch={patch}
                  onSetCustomizable={setIsCustomizable}
                  specs={specs}
                  customization={customization}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <ProductPublishSidebar
            form={form}
            errors={errors}
            categories={categories}
            brands={brands}
            onPatch={patch}
          />
        </aside>
      </div>
    </div>
  )
}