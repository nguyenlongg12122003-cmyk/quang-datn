import type { Voucher, VoucherStatus } from '@/types'

/** Trạng thái hiển thị: ưu tiên hết hạn theo endDate trước status trong DB. */
export function getEffectiveVoucherStatus(voucher: Voucher, now = Date.now()): VoucherStatus {
  if (voucher.endDate && new Date(voucher.endDate).getTime() < now) return 'expired'
  return voucher.status ?? 'active'
}