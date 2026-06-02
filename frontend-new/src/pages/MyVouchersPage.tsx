import { Link } from 'react-router'
import { Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { VoucherCard } from '@/features/vouchers/VoucherCard'
import { useMyVouchers } from '@/features/vouchers/api'

export function MyVouchersPage() {
  const { data: userVouchers = [], isLoading } = useMyVouchers()

  return (
    <PageContainer className="space-y-6">
      <h1 className="text-2xl font-bold">Voucher của tôi</h1>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : userVouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Bạn chưa lưu voucher nào"
          description="Khám phá và lưu các mã giảm giá để dùng khi thanh toán."
          action={
            <Button asChild>
              <Link to="/vouchers">Xem voucher</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userVouchers.map((uv) => (
            <VoucherCard key={uv.id} voucher={uv.voucher} used={uv.isUsed} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
