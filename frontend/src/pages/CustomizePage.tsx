import { useState, useEffect } from 'react';
import { Sparkles, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { catalogApi, supportChatApi, formatPrice, normalizeCustomizationOptions, type Product } from '@/lib/api-service';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export function CustomizePage() {
  const navigate = useNavigate();
  const [customizableProducts, setCustomizableProducts] = useState<Product[]>([]);
  useEffect(() => { catalogApi.getProducts({ isCustomizable: true }).then(setCustomizableProducts).catch(() => {}); }, []);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [customType, setCustomType] = useState('');
  const [customText, setCustomText] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);

  const addItem = useCartStore(s => s.addItem);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    setCustomType('');
    setCustomText('');
    setQuantity(1);
  }, [selectedProduct]);

  const selectedProductData = customizableProducts.find(p => p.id === selectedProduct) || null;
  const selectedOptions = normalizeCustomizationOptions(selectedProductData?.customizationOptions);
  const selectedOption = selectedOptions.find(opt => opt.key === customType) || null;
  const selectedExtraPrice = selectedOption?.extraPrice || 0;

  const handleAddToCart = () => {
    if (!selectedProduct || !customType || !customText) {
      toast.error('Vui lòng chọn sản phẩm và nhập nội dung tùy chỉnh');
      return;
    }
    if (quantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }
    void addItem(selectedProduct, quantity, {
      type: selectedOption?.label || customType,
      text: customText.trim(),
      extraPrice: selectedExtraPrice,
      inputType: selectedOption?.inputType,
    });
    toast.success('Đã thêm sản phẩm tùy chỉnh vào giỏ hàng');
  };

  useEffect(() => {
    setCustomText('');
  }, [customType]);

  const handleRequestQuote = async () => {
    if (!contactName || !contactPhone) {
      toast.error('Vui lòng nhập thông tin liên hệ');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để gửi yêu cầu báo giá');
      return;
    }

    setSendingQuote(true);
    try {
      const selectedProductName = selectedProductData?.name || 'Chua chon';
      const messageLines = [
        '[YEU_CAU_BAO_GIA_TUY_CHINH]',
        `Nguoi lien he: ${contactName}`,
        `So dien thoai: ${contactPhone}`,
        `San pham quan tam: ${selectedProductName}`,
        `Loai tuy chinh: ${selectedOption?.label || customType || 'Chua chon'}`,
        `Noi dung tuy chinh: ${customText || 'Chua nhap'}`,
        `So luong du kien: ${quantity}`,
        `Yeu cau: ${contactNote || 'Khong co'}`,
      ];
      await supportChatApi.sendMessage(messageLines.join('\n'));
      toast.success('Đã gửi yêu cầu báo giá đến bộ phận kinh doanh');
    } catch {
      toast.error('Không gửi được yêu cầu báo giá. Vui lòng thử lại.');
    } finally {
      setSendingQuote(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-white/20 text-white border-0 mb-4 text-lg px-4 py-1">
            <Sparkles className="h-5 w-5 mr-1" /> Tùy chỉnh sản phẩm
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Cá nhân hóa sản phẩm theo nhu cầu</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Mỗi sản phẩm có thể hỗ trợ các kiểu tùy chỉnh khác nhau do admin cấu hình, từ in ấn, khắc, dập nổi đến các nội dung theo chiến dịch riêng.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Products */}
          <div>
            <h2 className="text-xl font-bold mb-4">Sản phẩm có thể tùy chỉnh</h2>
            <div className="grid grid-cols-2 gap-4">
              {customizableProducts.map(product => (
                <Card key={product.id} className={`cursor-pointer transition-all ${selectedProduct === product.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedProduct(product.id)}>
                  <CardContent className="p-3">
                    <img src={product.images[0]?.url} alt={product.name} className="w-full h-32 object-cover rounded-md mb-2" />
                    <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-600 text-sm">{formatPrice(product.price)}</span>
                      <Badge variant="secondary" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Tùy chỉnh</Badge>
                    </div>
                    {normalizeCustomizationOptions(product.customizationOptions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {normalizeCustomizationOptions(product.customizationOptions).map(opt => (
                          <Badge key={opt.key} variant="outline" className="text-xs">{opt.label}{opt.extraPrice ? ` (+${formatPrice(opt.extraPrice)})` : ''}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Customization form */}
          <div>
            <h2 className="text-xl font-bold mb-4">Thông tin tùy chỉnh</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Sản phẩm đã chọn</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {customizableProducts.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <>
                    <div className="space-y-2">
                      <Label>Loại tùy chỉnh</Label>
                      <Select value={customType} onValueChange={setCustomType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại tùy chỉnh" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedOptions.map(opt => (
                            <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nội dung in/khắc</Label>
                      {selectedOption?.inputType === 'image' ? (
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setCustomText(String(reader.result || ''));
                              reader.readAsDataURL(file);
                            }}
                          />
                          {customText && (
                            <img src={customText} alt="Ảnh tùy chỉnh" className="h-28 w-28 rounded border object-cover" />
                          )}
                        </div>
                      ) : (
                        <Input
                          placeholder={selectedOption?.placeholder || 'VD: Công ty ABC, Nguyễn Văn A...'}
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">{selectedOption?.helpText || 'Nội dung này sẽ hiển thị cho admin trong chi tiết đơn hàng.'}</p>
                      {selectedExtraPrice > 0 && <p className="text-xs text-amber-700">Phụ phí tùy chỉnh: +{formatPrice(selectedExtraPrice)} / sản phẩm</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    {/* Preview */}
                    {customText && (
                      <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed">
                        <Label className="text-xs text-muted-foreground mb-2 block">Xem trước</Label>
                        <div className="text-center">
                          {selectedOption?.inputType === 'image' ? (
                            <img src={customText} alt="Ảnh tùy chỉnh" className="mx-auto h-28 w-28 rounded border object-cover" />
                          ) : (
                            <div className="text-lg font-semibold text-primary">{customText}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">{selectedOption?.label || customType}</div>
                          {selectedExtraPrice > 0 && <div className="text-xs text-amber-700 mt-1">+{formatPrice(selectedExtraPrice)} / sản phẩm</div>}
                        </div>
                      </div>
                    )}

                    <Button className="w-full gap-2" onClick={handleAddToCart}>
                      <ShoppingCart className="h-4 w-4" /> Thêm vào giỏ hàng
                    </Button>
                  </>
                )}

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Đặt hàng số lượng lớn? Liên hệ báo giá</h3>
                  <div className="space-y-3">
                    <Input placeholder="Họ tên" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    <Input placeholder="Số điện thoại" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    <Textarea placeholder="Mô tả yêu cầu..." value={contactNote} onChange={(e) => setContactNote(e.target.value)} />
                    <Button variant="outline" className="w-full" onClick={() => void handleRequestQuote()} disabled={sendingQuote}>
                      {sendingQuote ? 'Đang gửi...' : 'Gửi yêu cầu báo giá'}
                    </Button>
                    {!isAuthenticated && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Bạn cần đăng nhập để gửi yêu cầu và nhận phản hồi qua chat.</p>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => navigate('/login?redirect=%2Fcustomize')}
                        >
                          Đăng nhập ngay
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
