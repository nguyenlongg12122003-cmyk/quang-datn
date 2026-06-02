import { toast } from 'sonner'
import { Ticket } from 'lucide-react'
import { PageContainer, SectionHeading } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { VoucherCard } from '@/features/vouchers/VoucherCard'
import { useClaimVoucher, useMyVouchers, usePublicVouchers } from '@/features/vouchers/api'
import { useAuthStore } from '@/stores/auth-store'
import { getErrorMessage } from '@/lib/api/axios'
import type { Voucher } from '@/types'

export function VouchersPage() {
  const { data: vouchers = [], isLoading } = usePublicVouchers()
  const { data: myVouchers = [] } = useMyVouchers()
  const claim = useClaimVoucher()
  const token = useAuthStore((s) => s.token)

  const claimedIds = new Set(myVouchers.map((uv) => uv.voucherId))

  const handleClaim = (voucher: Voucher) => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để lưu voucher')
      return
    }
    claim.mutate(voucher.id, {
      onSuccess: () => toast.success('Đã lưu voucher vào tài khoản'),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <PageContainer className="space-y-6">
      <SectionHeading title="Voucher khuyến mãi" description="Lưu mã và áp dụng khi thanh toán." />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : vouchers.length === 0 ? (
        <EmptyState icon={Ticket} title="Hiện chưa có voucher" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vouchers.map((v) => (
            <VoucherCard
              key={v.id}
              voucher={v}
              onClaim={handleClaim}
              claiming={claim.isPending}
              claimed={claimedIds.has(v.id)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
