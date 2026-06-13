import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { orderApi } from '@/lib/api/endpoints/orders'

type Status = 'loading' | 'success' | 'pending' | 'failed'

export function PosPaymentReturnPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [orderId, setOrderId] = useState<string | undefined>()

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries())
    orderApi
      .verifyPayos(params)
      .then((res) => {
        setOrderId(res.orderId)
        if (res.success) setStatus('success')
        else if (res.pending) setStatus('pending')
        else setStatus('failed')
      })
      .catch(() => setStatus('failed'))
  }, [searchParams])

  const config = {
    loading: { icon: Clock, title: 'Đang xác nhận thanh toán…', desc: 'Vui lòng đợi trong giây lát.', color: 'text-muted-foreground' },
    success: { icon: CheckCircle2, title: 'Thanh toán PayOS thành công!', desc: 'Đơn bán tại quầy đã hoàn tất.', color: 'text-green-600' },
    pending: { icon: Clock, title: 'Thanh toán đang xử lý', desc: 'Chúng tôi sẽ cập nhật khi có kết quả.', color: 'text-amber-500' },
    failed: { icon: XCircle, title: 'Thanh toán thất bại', desc: 'Giao dịch chưa hoàn tất. Kiểm tra lại tại quầy.', color: 'text-destructive' },
  }[status]

  const Icon = config.icon

  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Icon className={`size-16 ${config.color} ${status === 'loading' ? 'animate-pulse' : ''}`} />
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{config.title}</h1>
            <p className="text-sm text-muted-foreground">{config.desc}</p>
            {orderId ? (
              <p className="text-sm">
                Mã đơn: <span className="font-medium">{orderId}</span>
              </p>
            ) : null}
          </div>
          {status !== 'loading' ? (
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/pos">Quay lại bán hàng</Link>
              </Button>
              {orderId ? (
                <Button asChild variant="outline">
                  <Link to={`/orders/${orderId}`}>Xem đơn hàng</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}