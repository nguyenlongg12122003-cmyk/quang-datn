import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Heart, ShoppingCart, Sparkles } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PriceTag } from '@/components/common/PriceTag'
import { RatingStars } from '@/components/common/RatingStars'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { ImageUploader } from '@/components/common/ImageUploader'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  getB2BTierPrices,
  getDiscountPercent,
  getPackagingUnitPrice,
  getPublicBulkTierPrices,
  getUnitPriceForQty,
  hasB2BPricing,
  isFlashSaleActive,
  normalizeCustomizationOptions,
} from '@/lib/product'
import { useApprovedBusinessPricing } from '@/features/business/useApprovedBusinessPricing'
import { TierPriceTable } from '@/features/product/TierPriceTable'
import { FlashSaleCountdown } from '@/features/product/FlashSaleCountdown'
import { MobilePurchaseBar } from '@/features/product/MobilePurchaseBar'
import { isLightSwatch, resolveColorSwatch } from '@/features/product/color-utils'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { CUSTOMER_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
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
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const token = useAuthStore((s) => s.token)
  const { hasB2BAccess, customerType: b2bCustomerType, profile } = useApprovedBusinessPricing()
  const pricingCustomerType = hasB2BAccess ? b2bCustomerType : 'retail'
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
    ? (getPackagingUnitPrice(product, packagingUnit, packagingQty, pricingCustomerType) ??
      getUnitPriceForQty(product, effectiveQty, pricingCustomerType))
    : getUnitPriceForQty(product, quantity, pricingCustomerType)
  const inWishlist = wishlistIds.has(product.id)
  const outOfStock = product.stock <= 0
  const isLowStock =
    !outOfStock &&
    product.lowStockThreshold != null &&
    product.stock <= product.lowStockThreshold
  const flashSale = isFlashSaleActive(product)
  const showB2BBadge = hasB2BAccess && hasB2BPricing(product, b2bCustomerType)
  const discountPercent = getDiscountPercent({
    ...product,
    price: unitPrice,
    flashSalePrice: showB2BBadge ? null : product.flashSalePrice,
    isFlashSale: showB2BBadge ? false : product.isFlashSale,
  })

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

  const addToCart = () => {
    if (outOfStock || !validateCustomization()) return false
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
    return true
  }

  const handleAddToCart = () => {
    addToCart()
  }

  const handleBuyNow = () => {
    if (addToCart()) navigate('/checkout')
  }

  const handleToggleWishlist = () => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để dùng danh sách yêu thích')
      return
    }
    if (inWishlist) removeWishlist.mutate(product.id)
    else addWishlist.mutate(product.id, { onSuccess: () => toast.success('Đã thêm vào yêu thích') })
  }

  const handleTierSelect = (minQty: number) => {
    if (packagingUnit) return
    setQuantity(Math.min(minQty, Math.max(1, product.stock)))
  }

  const publicTiers = useMemo(() => getPublicBulkTierPrices(product), [product])
  const b2bTiers = useMemo(
    () => (hasB2BAccess ? getB2BTierPrices(product, b2bCustomerType) : []),
    [product, hasB2BAccess, b2bCustomerType],
  )

  const businessCta = (() => {
    if (hasB2BAccess) return null
    if (profile?.status === 'pending') {
      return (
        <p className="text-xs text-muted-foreground">
          Hồ sơ doanh nghiệp đang chờ admin duyệt. Sau khi duyệt, bạn sẽ thấy bảng{' '}
          <span className="font-medium text-primary">Giá sỉ / Giá đại lý</span> riêng.
        </p>
      )
    }
    if (profile?.status === 'rejected') {
      return (
        <p className="text-xs text-muted-foreground">
          <Link to="/account" className="font-medium text-primary hover:underline">
            Gửi lại hồ sơ doanh nghiệp
          </Link>
          {' '}để được xem giá sỉ / đại lý sau khi duyệt.
        </p>
      )
    }
    return (
      <p className="text-xs text-muted-foreground">
        Mua số lượng lớn cho công ty?{' '}
        <Link to="/account" className="font-medium text-primary hover:underline">
          Đăng ký tài khoản doanh nghiệp
        </Link>
        {' '}để được giá sỉ / đại lý sau khi admin duyệt.
      </p>
    )
  })()

  const extraPrice = selectedOption?.extraPrice ?? 0
  const lineTotal = (unitPrice + extraPrice) * (packagingUnit ? effectiveQty : quantity)
  const onSale =
    product.originalPrice != null && product.originalPrice > unitPrice

  return (
    <>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            {showB2BBadge ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                {CUSTOMER_TYPE_LABELS[b2bCustomerType]}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <RatingStars rating={product.rating ?? 0} /> ({product.reviewCount ?? 0})
            </span>
            <span>Đã bán {formatNumber(product.sold ?? 0)}</span>
            <span>SKU: {product.sku}</span>
          </div>
        </div>

        <div className="rounded-xl bg-secondary/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PriceTag price={unitPrice} originalPrice={product.originalPrice} size="lg" />
            {discountPercent > 0 ? (
              <Badge className="bg-commerce text-commerce-foreground hover:bg-commerce/90">
                -{discountPercent}%
              </Badge>
            ) : null}
          </div>
          {flashSale ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="gap-1 bg-commerce text-commerce-foreground hover:bg-commerce/90">
                <Sparkles className="size-3" /> Flash Sale
              </Badge>
              {product.flashSaleEnd ? (
                <FlashSaleCountdown endAt={product.flashSaleEnd} />
              ) : null}
            </div>
          ) : null}
          {hasB2BAccess ? (
            <div className="mt-2 text-xs font-medium text-primary">
              Giá {CUSTOMER_TYPE_LABELS[b2bCustomerType]} đang áp dụng (hồ sơ doanh nghiệp đã duyệt)
            </div>
          ) : null}
        </div>

        {hasB2BAccess ? (
          <TierPriceTable
            title={`Bảng giá ${CUSTOMER_TYPE_LABELS[b2bCustomerType]}`}
            tiers={b2bTiers}
            effectiveQty={effectiveQty}
            onTierSelect={handleTierSelect}
          />
        ) : (
          <>
            <TierPriceTable
              title="Giá ưu đãi khi mua số lượng lớn"
              tiers={publicTiers}
              effectiveQty={effectiveQty}
              onTierSelect={handleTierSelect}
            />
            {businessCta ? (
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5">
                {businessCta}
              </div>
            ) : null}
          </>
        )}

        {product.colors && product.colors.length > 0 ? (
          <div className="space-y-2">
            <Label>
              Màu sắc{color ? `: ${color}` : ''}
            </Label>
            <TooltipProvider>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => {
                  const swatch = resolveColorSwatch(c)
                  const selected = color === c
                  return (
                    <Tooltip key={c}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setColor(c)}
                          aria-label={c}
                          aria-pressed={selected}
                          className={cn(
                            'size-9 rounded-full border-2 transition-all',
                            selected
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-border hover:border-primary/50',
                            isLightSwatch(swatch) && 'shadow-inner',
                          )}
                          style={{ backgroundColor: swatch }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{c}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
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

            {product.customizationLeadDays ? (
              <p className="text-xs text-muted-foreground">
                Thời gian sản xuất tùy chỉnh: ~{product.customizationLeadDays} ngày
              </p>
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
            <span
              className={cn(
                'text-sm',
                outOfStock
                  ? 'font-medium text-destructive'
                  : isLowStock
                    ? 'font-medium text-amber-600'
                    : 'text-muted-foreground',
              )}
            >
              {outOfStock
                ? 'Hết hàng'
                : isLowStock
                  ? `Chỉ còn ${product.stock} — sắp hết!`
                  : `${product.stock} có sẵn`}
            </span>
          </div>
        ) : (
          <p
            className={cn(
              'text-sm',
              outOfStock
                ? 'font-medium text-destructive'
                : isLowStock
                  ? 'font-medium text-amber-600'
                  : 'text-muted-foreground',
            )}
          >
            {outOfStock
              ? 'Hết hàng'
              : isLowStock
                ? `Tồn kho: ${product.stock} sản phẩm — sắp hết!`
                : `Tồn kho: ${product.stock} sản phẩm`}
          </p>
        )}

        <div className="hidden items-center justify-between rounded-lg bg-muted p-3 lg:flex">
          <span className="text-sm text-muted-foreground">Tạm tính</span>
          <span className={onSale ? 'text-lg font-bold text-commerce' : 'text-lg font-bold text-primary'}>
            {formatCurrency(lineTotal)}
          </span>
        </div>

        <div className="hidden gap-3 lg:flex">
          <Button className="flex-1 gap-2" size="lg" onClick={handleAddToCart} disabled={outOfStock}>
            <ShoppingCart className="size-5" />
            {outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
          </Button>
          <Button variant="secondary" size="lg" onClick={handleBuyNow} disabled={outOfStock}>
            Mua ngay
          </Button>
          <Button variant="outline" size="lg" onClick={handleToggleWishlist} aria-label="Yêu thích">
            <Heart className={inWishlist ? 'fill-destructive text-destructive' : ''} />
          </Button>
        </div>
      </div>

      <MobilePurchaseBar
        lineTotal={lineTotal}
        onSale={onSale}
        outOfStock={outOfStock}
        inWishlist={inWishlist}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onToggleWishlist={handleToggleWishlist}
      />
    </>
  )
}