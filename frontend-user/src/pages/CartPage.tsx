import { Link, useNavigate } from 'react-router'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { formatCurrency } from '@/lib/format'
import {
  cartItemTotal,
  selectCartSubtotal,
  useCartStore,
} from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { useApprovedBusinessPricing } from '@/features/business/useApprovedBusinessPricing'
import { useCartReprice } from '@/features/cart/useCartReprice'
import { CUSTOMER_TYPE_LABELS } from '@/lib/constants'

export function CartPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const subtotal = useCartStore(selectCartSubtotal)
  const token = useAuthStore((s) => s.token)
  const { isApprovedBusiness, customerType, hasB2BAccess } = useApprovedBusinessPricing()
  useCartReprice()

  if (items.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={ShoppingCart}
          title="Giỏ hàng trống"
          description="Hãy khám phá sản phẩm và thêm vào giỏ hàng."
          action={
            <Button asChild>
              <Link to="/products">Mua sắm ngay</Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const handleCheckout = () => {
    if (!token) {
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    navigate('/checkout')
  }

  return (
    <PageContainer className="space-y-6">
      <h1 className="text-2xl font-bold">Giỏ hàng ({items.length})</h1>
      {hasB2BAccess ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-medium text-primary">
            {CUSTOMER_TYPE_LABELS[customerType]}
          </span>
          {' '}đang áp dụng — giá trong giỏ được cập nhật theo số lượng và nhóm giá doanh nghiệp.
        </p>
      ) : !isApprovedBusiness ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Mua số lượng lớn?{' '}
          <Link to="/account" className="font-medium text-primary hover:underline">
            Đăng ký tài khoản doanh nghiệp
          </Link>
          {' '}để được giá sỉ sau khi admin duyệt.
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.lineId}>
              <CardContent className="flex gap-3 p-3">
                <Link to={`/products/${item.slug}`} className="shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="size-20 rounded-lg object-cover" />
                  ) : (
                    <div className="size-20 rounded-lg bg-muted" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/products/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
                      {item.name}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.lineId)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {item.packagingUnit ? (
                    <p className="text-xs text-muted-foreground">Quy cách: {item.packagingUnit}</p>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <QuantityStepper
                      value={item.quantity}
                      min={1}
                      max={item.stock}
                      onChange={(qty) => updateQuantity(item.lineId, qty)}
                    />
                    <span className="font-semibold text-primary">{formatCurrency(cartItemTotal(item))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="space-y-4 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tạm tính</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Phí vận chuyển và mã giảm giá được tính ở bước thanh toán.
            </p>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Tổng tạm tính</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(subtotal)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={handleCheckout}>
              Tiến hành thanh toán
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}