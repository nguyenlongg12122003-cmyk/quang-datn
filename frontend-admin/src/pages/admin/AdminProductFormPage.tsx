import { Link, useNavigate, useParams } from 'react-router'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb'
import { ProductForm } from '@/features/admin/ProductForm'
import { useProduct } from '@/features/catalog/api'
import { getErrorMessage } from '@/lib/api/axios'

export function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const { data: product, isLoading, isError, error, refetch } = useProduct(id ?? '', {
    enabled: isEdit,
  })

  const goBack = () => navigate('/products')

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-72" />
        <div className="flex justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-[520px] w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isEdit && isError) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Sản phẩm', href: '/products' },
            { label: 'Sửa sản phẩm' },
          ]}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Không tải được sản phẩm</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{getErrorMessage(error)}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Thử lại
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">Về danh sách</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isEdit && !product) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Sản phẩm', href: '/products' },
            { label: 'Không tìm thấy' },
          ]}
        />
        <Alert>
          <AlertTitle>Sản phẩm không tồn tại</AlertTitle>
          <AlertDescription>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to="/products">Quay lại danh sách sản phẩm</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const breadcrumbItems = isEdit
    ? [
        { label: 'Sản phẩm', href: '/products' },
        { label: product!.name },
      ]
    : [
        { label: 'Sản phẩm', href: '/products' },
        { label: 'Thêm sản phẩm' },
      ]

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={breadcrumbItems} />
      <ProductForm
        key={product?.id ?? 'new'}
        product={isEdit ? product! : null}
        onSuccess={goBack}
        onCancel={goBack}
      />
    </div>
  )
}