import { useState } from 'react'
import { Link } from 'react-router'
import { FileText, Phone, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'

const DISMISS_KEY = 'quangvpp-promo-bar-dismissed'

export function PromoTopBar() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative bg-brand-700 text-brand-50">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-10 py-2 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="size-3.5 shrink-0" aria-hidden />
            Miễn phí vận chuyển đơn từ {formatCurrency(FREE_SHIPPING_THRESHOLD)}
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <Phone className="size-3.5 shrink-0" aria-hidden />
            Hotline: 1900 1234 (8h–21h)
          </span>
          <Link
            to="/quotations"
            className="inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline"
          >
            <FileText className="size-3.5 shrink-0" aria-hidden />
            Báo giá sỉ / Doanh nghiệp
          </Link>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-50 hover:bg-brand-600 hover:text-brand-50"
          onClick={handleDismiss}
          aria-label="Đóng thông báo"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}