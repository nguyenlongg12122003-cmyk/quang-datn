import { Link, useNavigate } from 'react-router';
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cart-store';
import { formatPrice, type Voucher } from '@/lib/api-service';
import { toast } from 'sonner';
import { VoucherInput } from '@/components/voucher/VoucherInput';

export function CartPage() {
  const {
    items, voucherCode, voucherDiscount,
    updateQuantity, removeItem, clearCart,
    removeVoucher,
    getSubtotal, getShippingFee, getTotal
  } = useCartStore();
  const navigate = useNavigate();

  const cartProducts = items.filter(item => item.product);

  const handleApplyVoucher = (voucher: Voucher, discount: number) => {
    useCartStore.setState({ voucherCode: voucher.code, voucherDiscount: discount });
    toast.success('Áp dụng mã giảm giá thành công!');
  };

  const handleRemoveVoucher = () => {
    removeVoucher();
    toast.info('Đã xóa mã giảm giá');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingCart className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Giỏ hàng trống</h1>
        <p className="text-muted-foreground mb-6">Hãy thêm sản phẩm vào giỏ hàng</p>
        <Link to="/">
          <Button size="lg">Tiếp tục mua sắm</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Giỏ hàng ({items.length} sản phẩm)</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cartProducts.map(({ lineItemId, productId, quantity, customization, product }) => {
            if (!product) return null;
            const price = product.price;
            const rowId = lineItemId || (customization
              ? `${productId}::${customization.type.trim()}::${customization.text.trim()}::${customization.extraPrice || 0}`
              : `${productId}::default`);
            return (
              <Card key={rowId}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Link to={`/product/${product.slug}`}>
                      <img src={product.images[0]?.url} alt={product.name} className="w-24 h-24 object-cover rounded-md" />
                    </Link>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <Link to={`/product/${product.slug}`} className="font-medium hover:text-primary text-foreground">
                            {product.name}
                          </Link>
                          {customization && (
                            <div className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {customization.inputType === 'image'
                                ? `${customization.type}: Ảnh thiết kế`
                                : `${customization.type}: ${customization.text}`}
                            </div>
                          )}
                          {customization?.inputType === 'image' && customization.text.startsWith('data:image/') && (
                            <img src={customization.text} alt="Ảnh tùy chỉnh" className="mt-1 h-12 w-12 rounded border object-cover" />
                          )}
                          {customization?.extraPrice ? (
                            <div className="text-xs text-amber-700 mt-1">Phụ phí tùy chỉnh: +{formatPrice(customization.extraPrice)} / sản phẩm</div>
                          ) : null}
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => { removeItem(rowId); toast.info('Đã xóa sản phẩm'); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border rounded-md">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(rowId, quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-10 text-center text-sm">{quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(rowId, quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">{formatPrice(price * quantity)}</div>
                          {quantity > 1 && <div className="text-xs text-muted-foreground">{formatPrice(price)}/cái</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-between">
            <Link to="/">
              <Button variant="outline">← Tiếp tục mua sắm</Button>
            </Link>
            <Button variant="ghost" className="text-red-500" onClick={() => { clearCart(); toast.info('Đã xóa giỏ hàng'); }}>
              Xóa tất cả
            </Button>
          </div>
        </div>

        {/* Order summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voucher */}
              <VoucherInput
                subtotal={getSubtotal()}
                onApply={handleApplyVoucher}
                onRemove={handleRemoveVoucher}
                appliedVoucher={voucherCode ? { code: voucherCode, discount: voucherDiscount } : null}
              />

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatPrice(getSubtotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span>{getShippingFee() === 0 ? <span className="text-green-600">Miễn phí</span> : formatPrice(getShippingFee())}</span>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá</span>
                    <span>-{formatPrice(voucherDiscount)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng</span>
                <span className="text-red-600">{formatPrice(getTotal())}</span>
              </div>

              <Button className="w-full" size="lg" onClick={() => navigate('/checkout')}>
                Tiến hành thanh toán <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Miễn phí vận chuyển cho đơn hàng từ 500.000đ
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
