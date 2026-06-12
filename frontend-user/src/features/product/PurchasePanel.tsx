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
import { ImageUploader } from '@/components/common/ImageUploader'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  getPackagingUnitPrice,
  getUnitPriceForQty,
  isFlashSaleActive,
  normalizeCustomizationOptions,
} from '@/lib/product'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { CUSTOMER_TYPE_LABELS } from '@/lib/constants'
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistIds,
} from '@/features/wishlist/api'
import type { OrderItemCustomization, Product } from '@/types'

interface PurchasePanelProps {
  product: Product
}

export function PurchasePanel({ product }: PurchasePanelProps) {
  const addItem = useCartStore((s) => s.addItem)
  const token = useAuthStore((s) => s.token)
  const customerType = useAuthStore((s) => s.user?.customerType ?? 'retail')
  const wishlistIds = useWishlistIds()
  const addWishlist = useAddToWishlist()
  const removeWishlist = useRemoveFromWishlist()

  const [quantity, setQuantity] = useState(1)
  const [packagingUnit, setPackagingUnit] = useState<string>('')
  const [packagingQty, setPackagingQty] = useState(1)
  const [color, setColor] = useState<string | undefined>(product.colors?.[0])
  const [optionLabel, setOptionLabel] = useState<string>('')
  const [customText, setCustomText] = useState('')

  const options = useMemo(
    () => normalizeCustomizationOptions(product.customizationOptions),
    [product.customizationOptions],
  )
  const selectedOption = options.find((o) => o.label === optionLabel)

  const effectiveQty = packagingUnit
    ? (product.packagingUnits?.find((u) => u.label === packagingUnit)?.qtyPerUnit ?? 1) * packagingQty
    : quantity
  const unitPrice = packagingUnit
    ? (getPackagingUnitPrice(product, packagingUnit, packagingQty, customerType) ??
      getUnitPriceForQty(product, effectiveQty, customerType))
    : getUnitPriceForQty(product, quantity, customerType)
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

  const validateCustomization = (): boolean => {
    if (!product.isCustomizable || !selectedOption) return true
    if (!customText) {
      toast.error('Vui lòng nhập nội dung tùy chỉnh')
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
        packagingUnit: packagingUnit || null,
        packagingQty: packagingUnit ? packagingQty : 1,
      },
      packagingUnit ? effectiveQty : quantity,
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
  const lineTotal = (unitPrice + extraPrice) * (packagingUnit ? effectiveQty : quantity)
  const onSale =
    product.originalPrice != null && product.originalPrice > unitPrice

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
          <Badge className="mt-2 bg-commerce text-commerce-foreground hover:bg-commerce/90">
            ⚡ Flash Sale
          </Badge>
        ) : null}
        {customerType !== 'retail' ? (
          <div className="mt-2 text-xs text-primary font-medium">
            Giá {CUSTOMER_TYPE_LABELS[customerType]} đang áp dụng (theo hồ sơ doanh nghiệp B2B đã duyệt)
          </div>
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
          <Select
            value={optionLabel}
            onValueChange={(v) => {
              setOptionLabel(v)
              setCustomText('')
            }}
          >
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
            <div className="space-y-1">
              <Input
                placeholder={selectedOption.placeholder ?? 'Nhập nội dung in'}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              {selectedOption.helpText ? (
                <p className="text-xs text-muted-foreground">{selectedOption.helpText}</p>
              ) : null}
            </div>
          ) : null}

          {selectedOption?.inputType === 'image' ? (
            <div className="space-y-1">
              <ImageUploader
                value={customText}
                onChange={setCustomText}
                previewClassName="h-24 w-24 rounded-md"
              />
              {selectedOption.helpText ? (
                <p className="text-xs text-muted-foreground">{selectedOption.helpText}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {product.packagingUnits && product.packagingUnits.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <Label>Quy cách đóng gói</Label>
          <Select
            value={packagingUnit || '__retail__'}
            onValueChange={(v) => {
              if (v === '__retail__') {
                setPackagingUnit('')
                setPackagingQty(1)
                return
              }
              setPackagingUnit(v)
              setPackagingQty(1)
            }}
          >
            <SelectTrigger><SelectValue placeholder="Chọn quy cách" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__retail__">Mua lẻ (từng sản phẩm)</SelectItem>
              {product.packagingUnits.map((unit) => (
                <SelectItem key={unit.label} value={unit.label}>
                  {unit.label} ({unit.qtyPerUnit} sp/{unit.label.toLowerCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {packagingUnit ? (
            <div className="flex items-center gap-3">
              <Label>Số {packagingUnit.toLowerCase()}</Label>
              <QuantityStepper value={packagingQty} onChange={setPackagingQty} max={99} />
              <span className="text-sm text-muted-foreground">= {effectiveQty} sản phẩm</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {!packagingUnit ? (
        <div className="flex items-center gap-3">
          <Label>Số lượng</Label>
          <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, product.stock)} />
          <span className="text-sm text-muted-foreground">{product.stock} có sẵn</span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tồn kho: {product.stock} sản phẩm</p>
      )}

      <div className="flex items-center justify-between rounded-lg bg-muted p-3">
        <span className="text-sm text-muted-foreground">Tạm tính</span>
        <span className={onSale ? 'text-lg font-bold text-commerce' : 'text-lg font-bold text-primary'}>
          {formatCurrency(lineTotal)}
        </span>
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
