import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Mail, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function NewsletterCta() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Vui lòng nhập email hợp lệ')
      return
    }
    toast.success('Đã đăng ký! Xem voucher khuyến mãi tại trang Voucher.')
    setEmail('')
  }

  return (
    <section>
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-brand-50 via-background to-brand-50">
        <div className="grid items-center gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Ticket className="size-4" aria-hidden />
              Ưu đãi thành viên mới
            </span>
            <h3 className="text-xl font-bold sm:text-2xl">Nhận voucher giảm giá đơn đầu</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Đăng ký email để nhận mã giảm giá và cập nhật khuyến mãi Flash Sale mới nhất.
            </p>
            <Button asChild variant="link" className="h-auto gap-1 p-0 text-primary">
              <Link to="/vouchers">
                Xem voucher hiện có
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row md:max-w-sm">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email của bạn"
                className="h-10 pl-9"
                aria-label="Email đăng ký nhận voucher"
              />
            </div>
            <Button type="submit" className="shrink-0 gap-1">
              Đăng ký
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>
      </Card>
    </section>
  )
}