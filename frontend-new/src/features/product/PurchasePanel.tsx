import { useMemo, useState } from 'react'
import { Heart, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PriceTag } from '@/components/common/PriceTag'
import { RatingStars } from '@/components/common/RatingStars'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  getUnitPriceForQty,
  isFlashSaleActive,
  normalizeCustomizationOptions,
} from '@/lib/product'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistIds,
} from '@/features/wishlist/api'
import type { OrderItemCustomization, Product } from '@/types'

interface PurchasePanelProps {
  product: Product
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export function PurchasePanel({ product }: PurchasePanelProps) {
  const addItem = useCartStore((s) => s.addItem)
  const token = useAuthStore((s) => s.token)
  const wishlistIds = useWishlistIds()
  const addWishlist = useAddToWishlist()
  const removeWishlist = useRemoveFromWishlist()

  const [quantity, setQuantity] = useState(1)
  const [color, setColor] = useState<string | undefined>(product.colors?.[0])
  const [optionLabel, setOptionLabel] = useState<string>('')
  const [customText, setCustomText] = useState('')

  const options = useMemo(
    () => normalizeCustomizationOptions(product.customizationOptions),
    [product.customizationOptions],
  )
  const selectedOption = options.find((o) => o.label === optionLabel)

  const unitPrice = getUnitPriceForQty(product, quantity)
  const inWishlist = wishlistIds.has(product.id)
  const outOfStock = product.stock <= 0

  const buildCustomization = (): OrderItemCustomization | null => {
    if (!product.isCustomizable || !selectedOption) return null
    return {
      type: selectedOption.label,
      text: customText,
      inputType: selectedOption.inputType,
      extraPrice: selectedOption.extraPrice ?? 0,
    }
  }

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Ảnh tối đa 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setCustomText(String(reader.result))
    reader.readAsDataURL(file)
  }

  const validateCustomization = (): boolean => {
    if (!product.isCustomizable || !selectedOption) return true
    if (!customText) {
      toast.error('Vui lòng nhập nội dung tùy chỉnh')
      return false
    }
    if (selectedOption.inputType === 'image' && !customText.startsWith('data:image/')) {
      toast.error('Vui lòng tải lên ảnh hợp lệ')
      return false
    }
    return true
  }

  const handleAddToCart = () => {
    if (outOfStock || !validateCustomization()) return
    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        stock: product.stock,
        image: product.images?.[0]?.url,
        unitPrice,
      },
      quantity,
      buildCustomization(),
    )
    toast.success('Đã thêm vào giỏ hàng')
  }

  const handleToggleWishlist = () => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để dùng danh sách yêu thích')
      return
    }
    if (inWishlist) removeWishlist.mutate(product.id)
    else addWishlist.mutate(product.id, { onSuccess: () => toast.success('Đã thêm vào yêu thích') })
  }

  const extraPrice = selectedOption?.extraPrice ?? 0
  const lineTotal = (unitPrice + extraPrice) * quantity

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <RatingStars rating={product.rating ?? 0} /> ({product.reviewCount ?? 0})
          </span>
          <span>Đã bán {formatNumber(product.sold ?? 0)}</span>
          <span>SKU: {product.sku}</span>
        </div>
      </div>

      <div className="rounded-xl bg-secondary/50 p-4">
        <PriceTag price={unitPrice} originalPrice={product.originalPrice} size="lg" />
        {isFlashSaleActive(product) ? (
          <Badge className="mt-2">⚡ Flash Sale</Badge>
        ) : null}
      </div>

      {product.wholesalePrice && product.wholesalePrice.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">Giá sỉ</p>
          <ul className="grid gap-1 text-muted-foreground">
            {product.wholesalePrice.map((t) => (
              <li key={t.minQty} className="flex justify-between">
                <span>Từ {t.minQty} sản phẩm</span>
                <span className="font-medium text-foreground">{formatCurrency(t.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {product.colors && product.colors.length > 0 ? (
        <div className="space-y-2">
          <Label>Màu sắc</Label>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <Button
                key={c}
                type="button"
                variant={color === c ? 'default' : 'outline'}
                size="sm"
                onClick={() => setColor(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {product.isCustomizable && options.length > 0 ? (
        <div className="space-y-2">
          <Label>Tùy chỉnh in ấn</Label>
          <Select value={optionLabel} onValueChange={(v) => { setOptionLabel(v); setCustomText('') }}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn kiểu tùy chỉnh (tùy chọn)" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.label} value={o.label}>
                  {o.label}
                  {o.extraPrice ? ` (+${formatCurrency(o.extraPrice)})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOption?.inputType === 'text' ? (
            <Input
              placeholder={selectedOption.placeholder ?? 'Nhập nội dung in'}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          ) : null}
          {selectedOption?.inputType === 'image' ? (
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
              />
              {customText.startsWith('data:image/') ? (
                <img src={customText} alt="preview" className="h-20 rounded-md border border-border" />
              ) : null}
              {selectedOption.helpText ? (
                <p className="text-xs text-muted-foreground">{selectedOption.helpText}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Label>Số lượng</Label>
        <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, product.stock)} />
        <span className="text-sm text-muted-foreground">{product.stock} có sẵn</span>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted p-3">
        <span className="text-sm text-muted-foreground">Tạm tính</span>
        <span className="text-lg font-bold text-primary">{formatCurrency(lineTotal)}</span>
      </div>

      <div className="flex gap-3">
        <Button className="flex-1 gap-2" size="lg" onClick={handleAddToCart} disabled={outOfStock}>
          <ShoppingCart className="size-5" />
          {outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
        </Button>
        <Button variant="outline" size="lg" onClick={handleToggleWishlist} aria-label="Yêu thích">
          <Heart className={inWishlist ? 'fill-destructive text-destructive' : ''} />
        </Button>
      </div>
    </div>
  )
}
