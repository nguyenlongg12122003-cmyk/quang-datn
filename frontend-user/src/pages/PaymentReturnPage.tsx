import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/layout/PageContainer'
import { orderApi } from '@/lib/api/endpoints/orders'

type Provider = 'vnpay' | 'payos'
type Status = 'loading' | 'success' | 'pending' | 'failed'

interface PaymentReturnPageProps {
  provider: Provider
}

export function PaymentReturnPage({ provider }: PaymentReturnPageProps) {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [orderId, setOrderId] = useState<string | undefined>()

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries())
    const verify = provider === 'vnpay' ? orderApi.verifyVnpay : orderApi.verifyPayos

    verify(params)
      .then((res: { success?: boolean; pending?: boolean; orderId?: string }) => {
        setOrderId(res.orderId)
        if (res.success) setStatus('success')
        else if (res.pending) setStatus('pending')
        else setStatus('failed')
      })
      .catch(() => setStatus('failed'))
  }, [provider, searchParams])

  const config = {
    loading: { icon: Clock, title: 'Đang xác nhận thanh toán…', desc: 'Vui lòng đợi trong giây lát.', color: 'text-muted-foreground' },
    success: { icon: CheckCircle2, title: 'Thanh toán thành công!', desc: 'Đơn hàng của bạn đã được thanh toán.', color: 'text-green-600' },
    pending: { icon: Clock, title: 'Thanh toán đang xử lý', desc: 'Chúng tôi sẽ cập nhật khi có kết quả.', color: 'text-amber-500' },
    failed: { icon: XCircle, title: 'Thanh toán thất bại', desc: 'Giao dịch chưa hoàn tất. Bạn có thể thử lại.', color: 'text-destructive' },
  }[status]

  const Icon = config.icon

  return (
    <PageContainer className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Icon className={`size-16 ${config.color} ${status === 'loading' ? 'animate-pulse' : ''}`} />
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{config.title}</h1>
            <p className="text-sm text-muted-foreground">{config.desc}</p>
            {orderId ? <p className="text-sm">Mã đơn: <span className="font-medium">{orderId}</span></p> : null}
          </div>
          {status !== 'loading' ? (
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/orders">Xem đơn hàng</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/products">Tiếp tục mua sắm</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
