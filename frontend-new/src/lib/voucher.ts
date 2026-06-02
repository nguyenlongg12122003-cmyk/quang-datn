import { formatCurrency } from '@/lib/format'
import type { UserVoucher, Voucher } from '@/types'

/** Human-readable discount value, e.g. "Giảm 50.000₫" or "Giảm 10% (tối đa 100.000₫)". */
export function describeVoucherValue(voucher: Voucher): string {
  if (voucher.type === 'fixed') return `Giảm ${formatCurrency(voucher.value)}`
  const cap = voucher.maxDiscount ? ` (tối đa ${formatCurrency(voucher.maxDiscount)})` : ''
  return `Giảm ${voucher.value}%${cap}`
}

export interface VoucherEligibility {
  usable: boolean
  reason?: string
}

/**
 * Client-side gate for a claimed voucher at checkout. Server `validate` remains
 * authoritative — this only filters/labels the picker so we don't offer obviously
 * unusable codes.
 */
export function getSavedVoucherEligibility(
  userVoucher: UserVoucher,
  subtotal: number,
): VoucherEligibility {
  if (userVoucher.isUsed) return { usable: false, reason: 'Đã sử dụng' }
  if (userVoucher.expiresAt && new Date(userVoucher.expiresAt).getTime() < Date.now()) {
    return { usable: false, reason: 'Đã hết hạn' }
  }
  if (subtotal < userVoucher.voucher.minOrderValue) {
    return { usable: false, reason: `Đơn tối thiểu ${formatCurrency(userVoucher.voucher.minOrderValue)}` }
  }
  return { usable: true }
}
