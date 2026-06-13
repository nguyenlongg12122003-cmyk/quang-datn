import { Link } from 'react-router'
import { ArrowRight, Building2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function MidPageBanners() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-brand-50 to-background p-6">
        <div className="relative z-10 max-w-sm space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Building2 className="size-3.5" aria-hidden />
            Doanh nghiệp &amp; sỉ
          </span>
          <h3 className="text-xl font-bold">Giá sỉ cho doanh nghiệp</h3>
          <p className="text-sm text-muted-foreground">
            Đăng ký doanh nghiệp để được giá sỉ tự động, mua và thanh toán như khách hàng thường, hỗ trợ hóa đơn VAT.
          </p>
          <Button asChild size="sm" className="gap-1">
            <Link to="/account">
              Đăng ký doanh nghiệp
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <Building2
          className="pointer-events-none absolute -bottom-4 -right-4 size-32 text-primary/10"
          aria-hidden
        />
      </Card>

      <Card className="relative overflow-hidden border-commerce/25 bg-gradient-to-br from-commerce/10 to-background p-6">
        <div className="relative z-10 max-w-sm space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-commerce/15 px-2.5 py-0.5 text-xs font-semibold text-commerce">
            <Printer className="size-3.5" aria-hidden />
            In ấn tùy chỉnh
          </span>
          <h3 className="text-xl font-bold">In logo theo yêu cầu</h3>
          <p className="text-sm text-muted-foreground">
            Bút, sổ tay, name card, áo thun — miễn phí tư vấn thiết kế mẫu cho đơn hàng doanh nghiệp.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-1 border-commerce/40 text-commerce hover:bg-commerce/10">
            <Link to="/products?isCustomizable=true">
              Xem sản phẩm in ấn
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <Printer
          className="pointer-events-none absolute -bottom-4 -right-4 size-32 text-commerce/15"
          aria-hidden
        />
      </Card>
    </section>
  )
}